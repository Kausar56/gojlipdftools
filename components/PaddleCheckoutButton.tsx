"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { PADDLE_CLIENT_TOKEN, PADDLE_ENVIRONMENT } from "@/lib/paddleConfig";

// One shared instance across every button on the page — Paddle.js only
// needs (and expects) initializePaddle() to run once per page load.
let paddleInstancePromise: Promise<Paddle | undefined> | null = null;

function getPaddle(): Promise<Paddle | undefined> {
  if (!paddleInstancePromise) {
    paddleInstancePromise = initializePaddle({ token: PADDLE_CLIENT_TOKEN, environment: PADDLE_ENVIRONMENT });
  }
  return paddleInstancePromise;
}

export function PaddleCheckoutButton({
  planId,
  priceId,
  userId,
  userEmail,
  className,
  children,
}: {
  /** The plan's own id (e.g. "pro") — stored in customData so the webhook
   *  (app/api/webhooks/paddle/route.ts) knows which plan to grant without
   *  needing to look the price ID back up itself. */
  planId: string;
  /** Resolved server-side by app/pricing/page.tsx (lib/pricingPlans.ts's
   *  getPriceIdForInterval) for whichever billing interval is selected —
   *  null when this plan/interval combination has no Paddle price
   *  configured yet, in which case the button shows a friendly error
   *  instead of opening a broken checkout. */
  priceId: string | null;
  userId: string | null;
  userEmail: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!userId) {
      router.push(`/login?next=${encodeURIComponent("/pricing")}`);
      return;
    }

    if (!PADDLE_CLIENT_TOKEN || !priceId) {
      toast.error("Billing isn't configured yet — please try again later.");
      return;
    }

    setLoading(true);
    try {
      const paddle = await getPaddle();
      if (!paddle) {
        toast.error("Couldn't load the checkout. Please try again.");
        return;
      }
      // customData.userId is how the webhook later knows which Supabase
      // account to upgrade — Paddle has no concept of our own user IDs
      // otherwise.
      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: userEmail ? { email: userEmail } : undefined,
        customData: { userId, plan: planId },
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button type="button" onClick={handleClick} disabled={loading} className={className}>
      {loading ? "Loading..." : children}
    </button>
  );
}
