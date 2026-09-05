import { NextResponse } from "next/server";
import { Paddle, Environment, EventName, type SubscriptionNotification, type TransactionNotification } from "@paddle/paddle-node-sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlanForPriceId, planDisplayName, type PaidPlanId } from "@/lib/paddleConfig";
import { sendEmail, purchaseConfirmationEmail } from "@/lib/email";

function getPaddleServerClient(): Paddle {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) throw new Error("PADDLE_API_KEY is not set on the server.");
  const environment = process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? Environment.production : Environment.sandbox;
  return new Paddle(apiKey, { environment });
}

/**
 * Receives Paddle Billing's subscription/transaction webhooks and is the
 * single source of truth that keeps profiles.plan in sync with what was
 * actually paid for — see docs/PADDLE_INTEGRATION.md for the full flow and
 * how to point Paddle's dashboard at this URL.
 */
export async function POST(request: Request) {
  console.log("[paddle webhook] request received");

  const signature = request.headers.get("paddle-signature");
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  const rawBody = await request.text();

  if (!signature || !secret) {
    console.log("[paddle webhook] rejected: missing signature header or PADDLE_WEBHOOK_SECRET", {
      hasSignature: Boolean(signature),
      hasSecret: Boolean(secret),
    });
    return NextResponse.json({ error: "Missing webhook signature or secret." }, { status: 400 });
  }

  const paddle = getPaddleServerClient();

  let event;
  try {
    event = await paddle.webhooks.unmarshal(rawBody, secret, signature);
  } catch (error) {
    console.error("[paddle webhook] signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (!event) {
    console.log("[paddle webhook] unmarshal returned no event (unrecognized payload)");
    return NextResponse.json({ received: true });
  }

  console.log(`[paddle webhook] verified event: ${event.eventType}`);

  try {
    switch (event.eventType) {
      case EventName.SubscriptionCreated:
      case EventName.SubscriptionUpdated:
      case EventName.SubscriptionCanceled:
        await syncSubscription(paddle, event.data);
        console.log(`[paddle webhook] syncSubscription done for subscription ${event.data.id}`);
        break;
      case EventName.TransactionCompleted:
        await sendPurchaseConfirmation(event.data);
        console.log(`[paddle webhook] sendPurchaseConfirmation done for transaction ${event.data.id}`);
        break;
      default:
        // Every other event type (payment methods, addresses, etc.) is
        // outside what this app tracks — safe to ignore.
        console.log(`[paddle webhook] ignoring unhandled event type: ${event.eventType}`);
        break;
    }
  } catch (error) {
    console.error(`[paddle webhook] failed to process event ${event.eventType}:`, error);
    // Non-2xx so Paddle retries with its own backoff instead of us silently
    // losing a plan change — Paddle's dashboard also logs failed deliveries
    // for manual replay if retries are exhausted.
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/** Fired on subscription.created/updated/canceled — the one place
 *  profiles.plan actually changes. Downgrades to "free" whenever the
 *  subscription isn't in an active/trialing state (canceled, past_due,
 *  paused), rather than only reacting to the dedicated canceled event —
 *  Paddle can also land a subscription in those states without ever
 *  sending subscription.canceled specifically (e.g. a failed renewal).
 *
 *  The webhook payload itself (SubscriptionNotification) doesn't include
 *  managementUrls, so this re-fetches the full subscription from Paddle's
 *  API to get the cancel/update-payment-method links shown on the
 *  dashboard — see components/BillingStatusCard.tsx. */
async function syncSubscription(paddle: Paddle, notification: SubscriptionNotification) {
  const userId = notification.customData?.userId as string | undefined;
  if (!userId) {
    console.error("[paddle webhook] subscription event missing customData.userId — subscription", notification.id);
    return;
  }

  const subscription = await paddle.subscriptions.get(notification.id);

  const priceId = subscription.items[0]?.price?.id;
  const plan: PaidPlanId | null = priceId ? getPlanForPriceId(priceId) : null;
  const isActive = subscription.status === "active" || subscription.status === "trialing";
  console.log("[paddle webhook] syncSubscription", { userId, priceId, plan, status: subscription.status, willSetPlanTo: isActive && plan ? plan : "free" });
  if (priceId && !plan) {
    console.error(
      "[paddle webhook] priceId doesn't match any plan in lib/paddleConfig.ts — check NEXT_PUBLIC_PADDLE_PRICE_* env vars match this exact price ID:",
      priceId,
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      plan: isActive && plan ? plan : "free",
      paddle_customer_id: subscription.customerId,
      paddle_subscription_id: subscription.id,
      paddle_subscription_status: subscription.status,
      plan_renews_at: subscription.nextBilledAt,
      paddle_cancel_url: subscription.managementUrls?.cancel ?? null,
      paddle_update_payment_method_url: subscription.managementUrls?.updatePaymentMethod ?? null,
    })
    .eq("id", userId);

  if (error) throw new Error(`Failed to update profile ${userId} from Paddle subscription: ${error.message}`);
}

/** Fired once a payment actually clears — sends the purchase-confirmation
 *  email (see email-templates/purchase-confirmation.html for the design).
 *  Distinct from syncSubscription: a transaction can complete for a renewal
 *  just as much as a first purchase, and this only needs to notify the
 *  user, not touch their plan (syncSubscription already does that). */
async function sendPurchaseConfirmation(transaction: TransactionNotification) {
  const userId = transaction.customData?.userId as string | undefined;
  if (!userId || !transaction.subscriptionId) return;

  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  const email = data.user?.email;
  if (!email) return;

  const priceItem = transaction.items[0]?.price;
  const plan = priceItem ? getPlanForPriceId(priceItem.id) : null;
  const totalMinorUnits = transaction.details?.totals?.total;
  const amount =
    totalMinorUnits !== undefined
      ? `${transaction.currencyCode} ${(Number(totalMinorUnits) / 100).toFixed(2)}`
      : "—";
  const billingCycle = priceItem?.billingCycle
    ? `${priceItem.billingCycle.frequency > 1 ? `Every ${priceItem.billingCycle.frequency} ` : ""}${priceItem.billingCycle.interval}${priceItem.billingCycle.frequency > 1 ? "s" : ""}`
    : "—";

  const { subject, html } = purchaseConfirmationEmail({
    planName: plan ? planDisplayName(plan) : "your plan",
    billingCycle,
    amount,
    purchaseDate: new Date(transaction.billedAt ?? transaction.createdAt).toLocaleDateString(),
    orderId: transaction.id,
  });

  try {
    await sendEmail({ to: email, subject, html });
  } catch (error) {
    // A failed notification should never fail the webhook — the plan
    // change already succeeded via syncSubscription regardless.
    console.error("Failed to send purchase confirmation email:", error);
  }
}
