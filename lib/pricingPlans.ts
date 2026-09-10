import { unstable_cache } from "next/cache";
import { createAdminClient } from "./supabase/admin";

export type PlanFeature = { text: string; icon?: string };

export type PricingPlan = {
  id: string;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyPriceId: string | null;
  yearlyPriceId: string | null;
  cta: string;
  href: string | null;
  highlighted: boolean;
  displayOrder: number;
  features: PlanFeature[];
};

type PricingPlanRow = {
  id: string;
  name: string;
  tagline: string;
  monthly_price: number;
  yearly_price: number;
  monthly_price_id: string | null;
  yearly_price_id: string | null;
  cta: string;
  href: string | null;
  highlighted: boolean;
  display_order: number;
  features: PlanFeature[] | null;
};

function rowToPlan(row: PricingPlanRow): PricingPlan {
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline,
    monthlyPrice: Number(row.monthly_price),
    yearlyPrice: Number(row.yearly_price),
    monthlyPriceId: row.monthly_price_id,
    yearlyPriceId: row.yearly_price_id,
    cta: row.cta,
    href: row.href,
    highlighted: row.highlighted,
    displayOrder: row.display_order,
    features: row.features ?? [],
  };
}

// Service-role client (no next/headers cookies() dependency) — /pricing
// reads this on every render, so touching cookies() here would force it
// into dynamic rendering instead of staying statically prerenderable (same
// reasoning as lib/toolContent.ts and lib/appSettings.ts).
async function readPricingPlansFresh(): Promise<PricingPlan[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("pricing_plans").select("*").order("display_order").order("id");
    return (data ?? []).map((row) => rowToPlan(row as PricingPlanRow));
  } catch {
    // Table not created yet (docs/pricing-plans-schema.sql not run) or
    // Supabase env vars missing — /pricing must still render something
    // rather than 500; the page falls back to an empty list, which reads
    // as "no plans configured yet" rather than crashing.
    return [];
  }
}

// Short-TTL cache as a safety net; write actions call updateTag("pricing-plans")
// for near-instant invalidation, so this mostly guards a missed/failed
// revalidation. One shared cache entry (not per-plan) since every read site
// wants the full ordered list anyway.
function getCachedPricingPlans(): Promise<PricingPlan[]> {
  return unstable_cache(readPricingPlansFresh, ["pricing-plans"], {
    revalidate: 60,
    tags: ["pricing-plans"],
  })();
}

export async function getPricingPlans(): Promise<PricingPlan[]> {
  return getCachedPricingPlans();
}

/** Admin edit screens want the freshest rows (not the cached read used by
 *  the public /pricing page) so a save is reflected immediately. */
export async function getPricingPlansForEdit(): Promise<PricingPlan[]> {
  return readPricingPlansFresh();
}

export async function getPricingPlanForEdit(id: string): Promise<PricingPlan | null> {
  const plans = await readPricingPlansFresh();
  return plans.find((plan) => plan.id === id) ?? null;
}

/** Looks up which price ID a plan/interval combination should check out
 *  with — components/PaddleCheckoutButton.tsx no longer resolves this
 *  itself (that required a synchronous, browser-side lookup; price data is
 *  now server/DB-driven), so app/pricing/page.tsx resolves every plan's IDs
 *  once and passes them down as props instead. */
export function getPriceIdForInterval(plan: PricingPlan, interval: "month" | "year"): string | null {
  return interval === "year" ? plan.yearlyPriceId : plan.monthlyPriceId;
}

/** Reverse lookup used by the webhook (app/api/webhooks/paddle/route.ts) —
 *  a Paddle event only ever tells us which price was purchased, never our
 *  own plan id/name, so this is how that gets translated back. Uses the
 *  cached read (webhooks fire often enough that a fresh DB hit on every one
 *  isn't worth it, and a plan's price IDs don't change minute-to-minute). */
export async function getPlanForPriceId(priceId: string): Promise<PricingPlan | null> {
  const plans = await getCachedPricingPlans();
  return plans.find((plan) => plan.monthlyPriceId === priceId || plan.yearlyPriceId === priceId) ?? null;
}

export async function savePricingPlan(plan: PricingPlan): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("pricing_plans").upsert({
    id: plan.id,
    name: plan.name,
    tagline: plan.tagline,
    monthly_price: plan.monthlyPrice,
    yearly_price: plan.yearlyPrice,
    monthly_price_id: plan.monthlyPriceId,
    yearly_price_id: plan.yearlyPriceId,
    cta: plan.cta,
    href: plan.href,
    highlighted: plan.highlighted,
    display_order: plan.displayOrder,
    features: plan.features,
  });
  if (error) throw new Error(error.message);
}

export async function deletePricingPlan(id: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("pricing_plans").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
