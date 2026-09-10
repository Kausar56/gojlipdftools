/** "sandbox" while testing against Paddle's sandbox dashboard/API; switch to
 *  "production" (and swap every env var below to the live equivalents) only
 *  once real payments should start flowing. */
export const PADDLE_ENVIRONMENT: "production" | "sandbox" =
  process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox";

/** Client-side token for Paddle.js (components/PaddleCheckoutButton.tsx) —
 *  safe to expose, like a Stripe publishable key. Get it from Paddle
 *  Dashboard -> Developer Tools -> Authentication -> Client-side tokens. */
export const PADDLE_CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || "";

// Plan definitions (name, price, features, and Paddle price ID mapping)
// used to live here as a hardcoded PRICE_IDS table. They're now rows in the
// pricing_plans table, editable from /admin/pricing — see lib/pricingPlans.ts
// (getPricingPlans, getPriceIdForInterval, getPlanIdForPriceId).
