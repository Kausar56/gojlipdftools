import type { PlanId } from "./planLimits";

/**
 * OpenRouter model slug used for AI Summarize. Override via the
 * OPENROUTER_MODEL env var without a redeploy — check https://openrouter.ai/models
 * for current pricing/availability before changing the default, since model
 * lineups and slugs shift over time.
 */
export const AI_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

/**
 * Single source of truth for how many AI Summarize calls (the initial
 * summary plus every follow-up question count individually) a user gets per
 * calendar month. Change numbers here — no other code needs to change.
 * `null` = unlimited. Independent of `planLimits.ts`'s `monthlyConversions`
 * (office conversions) — these are billed and tracked separately even
 * though both live in the `conversion_usage` table (filtered by tool_slug).
 */
export const AI_SUMMARY_MONTHLY_LIMITS: Record<PlanId, number | null> = {
  free: 10,
  pro: 200,
  business: null,
};

export function getAiSummaryMonthlyLimit(plan: PlanId): number | null {
  return AI_SUMMARY_MONTHLY_LIMITS[plan];
}

/** Extracted PDF text is truncated to this many characters before being sent
 *  to the model — keeps prompt size (and cost) bounded for very large
 *  documents. ~20,000 characters is roughly 5,000 tokens, a safe margin
 *  below small/cheap models' context windows once history is added. */
export const AI_MAX_DOCUMENT_CHARS = 20000;

/** Caps how much chat history is resent on every follow-up call — each
 *  question re-sends the full document text as the system prompt, so
 *  history itself only needs to cover the visible conversation. */
export const AI_MAX_HISTORY_MESSAGES = 20;
