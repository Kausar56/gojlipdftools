export type BillingInterval = "month" | "year";
export type PaidPlanId = "pro" | "business";

/** "sandbox" while testing against Paddle's sandbox dashboard/API; switch to
 *  "production" (and swap every env var below to the live equivalents) only
 *  once real payments should start flowing. */
export const PADDLE_ENVIRONMENT: "production" | "sandbox" =
  process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox";

/** Client-side token for Paddle.js (components/PaddleCheckoutButton.tsx) —
 *  safe to expose, like a Stripe publishable key. Get it from Paddle
 *  Dashboard -> Developer Tools -> Authentication -> Client-side tokens. */
export const PADDLE_CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || "";

/**
 * Single source of truth mapping Gojli's own plan IDs to Paddle's price IDs.
 * Create the products/prices in the Paddle dashboard first (Catalog ->
 * Products), then paste each price's ID here via its env var. Change values
 * here (or the env vars) — no other code needs to change.
 */
const PRICE_IDS: Record<PaidPlanId, Record<BillingInterval, string>> = {
  pro: {
    month: process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY || "",
    year: process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_YEARLY || "",
  },
  business: {
    month: process.env.NEXT_PUBLIC_PADDLE_PRICE_BUSINESS_MONTHLY || "",
    year: process.env.NEXT_PUBLIC_PADDLE_PRICE_BUSINESS_YEARLY || "",
  },
};

export function getPaddlePriceId(plan: PaidPlanId, interval: BillingInterval): string {
  return PRICE_IDS[plan][interval];
}

/** Reverse lookup used by the webhook (app/api/webhooks/paddle/route.ts) —
 *  a Paddle event only ever tells us which price was purchased, never our
 *  own plan name, so this is how that gets translated back. Keep in sync
 *  with PRICE_IDS above whenever a price ID changes in the Paddle dashboard. */
export function getPlanForPriceId(priceId: string): PaidPlanId | null {
  for (const plan of Object.keys(PRICE_IDS) as PaidPlanId[]) {
    for (const interval of Object.keys(PRICE_IDS[plan]) as BillingInterval[]) {
      if (PRICE_IDS[plan][interval] && PRICE_IDS[plan][interval] === priceId) return plan;
    }
  }
  return null;
}

export function planDisplayName(plan: PaidPlanId): string {
  return plan === "business" ? "Business" : "Pro";
}
