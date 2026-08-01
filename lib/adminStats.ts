import { createAdminClient } from "./supabase/admin";
import type { PlanId } from "./planLimits";

export type AdminStats = {
  totalUsers: number;
  planCounts: Record<PlanId, number>;
  conversionsThisMonth: number;
  conversionsAllTime: number;
  users: { id: string; email: string; plan: PlanId; createdAt: string }[];
  recentActivity: { email: string; toolSlug: string; createdAt: string }[];
  byTool: { toolSlug: string; count: number }[];
};

function toPlanId(value: unknown): PlanId {
  return value === "pro" || value === "business" ? value : "free";
}

/** Every query here runs through the service-role client (bypasses Row Level
 *  Security) — the regular per-request client can only ever see the calling
 *  user's own rows, which is exactly wrong for an admin-wide dashboard. */
export async function getAdminStats(): Promise<AdminStats> {
  const supabase = createAdminClient();

  const { data: usersData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const authUsers = usersData?.users ?? [];

  const { data: profiles } = await supabase.from("profiles").select("id, plan");
  const planById = new Map((profiles ?? []).map((p) => [p.id as string, toPlanId(p.plan)]));

  const users = authUsers
    .map((user) => ({
      id: user.id,
      email: user.email ?? "(no email)",
      plan: planById.get(user.id) ?? ("free" as PlanId),
      createdAt: user.created_at,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const planCounts: Record<PlanId, number> = { free: 0, pro: 0, business: 0 };
  users.forEach((user) => planCounts[user.plan]++);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count: conversionsThisMonth } = await supabase
    .from("conversion_usage")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startOfMonth.toISOString());

  const { count: conversionsAllTime } = await supabase
    .from("conversion_usage")
    .select("id", { count: "exact", head: true });

  const { data: recentRows } = await supabase
    .from("conversion_usage")
    .select("user_id, tool_slug, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  const emailById = new Map(users.map((user) => [user.id, user.email]));
  const recentActivity = (recentRows ?? []).map((row) => ({
    email: emailById.get(row.user_id as string) ?? "(unknown)",
    toolSlug: row.tool_slug as string,
    createdAt: row.created_at as string,
  }));

  // No SQL "group by" available through the query builder without a
  // database function, so this pulls a capped batch of slugs and counts them
  // in memory — fine at this app's current scale.
  const { data: toolRows } = await supabase.from("conversion_usage").select("tool_slug").limit(5000);
  const toolCounts = new Map<string, number>();
  (toolRows ?? []).forEach((row) => {
    const slug = row.tool_slug as string;
    toolCounts.set(slug, (toolCounts.get(slug) ?? 0) + 1);
  });
  const byTool = Array.from(toolCounts.entries())
    .map(([toolSlug, count]) => ({ toolSlug, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalUsers: users.length,
    planCounts,
    conversionsThisMonth: conversionsThisMonth ?? 0,
    conversionsAllTime: conversionsAllTime ?? 0,
    users: users.slice(0, 100),
    recentActivity,
    byTool,
  };
}
