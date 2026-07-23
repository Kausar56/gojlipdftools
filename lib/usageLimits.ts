import type { SupabaseClient } from "@supabase/supabase-js";
import { getPlanLimits, type PlanId } from "./planLimits";

export async function getUserPlan(supabase: SupabaseClient, userId: string): Promise<PlanId> {
  const { data } = await supabase.from("profiles").select("plan").eq("id", userId).single();
  const plan = data?.plan;
  return plan === "pro" || plan === "business" ? plan : "free";
}

export async function getMonthlyUsageCount(supabase: SupabaseClient, userId: string): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("conversion_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startOfMonth.toISOString());

  return count ?? 0;
}

export async function recordUsage(
  supabase: SupabaseClient,
  userId: string,
  toolSlug: string,
  fileSizeBytes: number,
): Promise<void> {
  await supabase.from("conversion_usage").insert({
    user_id: userId,
    tool_slug: toolSlug,
    file_size_bytes: fileSizeBytes || null,
  });
}

export { getPlanLimits };
