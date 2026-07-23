export type PlanId = "free" | "pro" | "business";

export type PlanLimits = {
  /** Max upload size for server-side conversion tools (Word/Excel/PPT <-> PDF), in MB. */
  maxFileSizeMb: number;
  /** Max conversions per calendar month for those same tools. `null` = unlimited. */
  monthlyConversions: number | null;
};

/**
 * Single source of truth for free/paid limits on the tools that upload to a real
 * server (currently: pdf-to-word, word-to-pdf, excel-to-pdf, ppt-to-pdf via CloudConvert —
 * see docs/TOOLS_STATUS.md). Purely browser-side tools (merge, split, compress, etc.)
 * cost us nothing per use and are intentionally NOT gated here.
 *
 * Change numbers here — no other code needs to change. A future admin panel (or a
 * Stripe webhook) only ever needs to update `profiles.plan` per user; these tiers stay
 * the same either way.
 *
 * Note: /pricing currently shows office conversions as "not included" on Free. `free`
 * below gives a small trial quota instead of a hard 0 — a common, friendlier pattern
 * (Sejda/SmallPDF do the same). Set `monthlyConversions: 0` here if you'd rather match
 * the pricing page literally.
 */
export const planLimits: Record<PlanId, PlanLimits> = {
  free: {
    maxFileSizeMb: 25,
    monthlyConversions: 3,
  },
  pro: {
    maxFileSizeMb: 200,
    monthlyConversions: null,
  },
  business: {
    maxFileSizeMb: 1000,
    monthlyConversions: null,
  },
};

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  if (plan === "pro" || plan === "business") return planLimits[plan];
  return planLimits.free;
}
