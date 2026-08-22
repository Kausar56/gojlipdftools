import { createAdminClient } from "./supabase/admin";
import type { PlanId } from "./planLimits";
import { listTicketsForUser, type Ticket } from "./tickets";
import { getAuditLogForTarget, type AuditEntry } from "./auditLog";

export type ManagedUser = {
  id: string;
  email: string;
  plan: PlanId;
  createdAt: string;
  isBanned: boolean;
};

export type ToolUsageEntry = { toolSlug: string; count: number };

export type UserDetail = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  plan: PlanId;
  createdAt: string;
  lastSignInAt: string | null;
  isBanned: boolean;
  toolUsage: {
    totalConversions: number;
    byTool: ToolUsageEntry[];
    recent: { toolSlug: string; createdAt: string }[];
  };
  tickets: Ticket[];
  activity: AuditEntry[];
};

function toPlanId(value: unknown): PlanId {
  return value === "pro" || value === "business" ? value : "free";
}

/** Admin-only — the fuller sibling of getAdminStats()'s user list: same
 *  service-role listUsers()+profiles join, plus ban status for the Users
 *  management page's row actions. Kept separate from adminStats.ts so the
 *  dashboard's summary numbers don't have to change shape for this. */
export async function getUsersForAdmin(): Promise<ManagedUser[]> {
  const admin = createAdminClient();

  const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const authUsers = usersData?.users ?? [];

  const { data: profiles } = await admin.from("profiles").select("id, plan");
  const planById = new Map((profiles ?? []).map((p) => [p.id as string, toPlanId(p.plan)]));

  return authUsers
    .map((user) => ({
      id: user.id,
      email: user.email ?? "(no email)",
      plan: planById.get(user.id) ?? ("free" as PlanId),
      createdAt: user.created_at,
      // app_metadata.banned, not Supabase's native banned_until — see
      // app/admin/users/actions.ts's banUser for why.
      isBanned: user.app_metadata?.banned === true,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** The single-user drill-down behind clicking an email in the Users table
 *  (see app/admin/users/[id]/page.tsx) — everything about one account in one
 *  place: profile, plan, tool usage, their support tickets, and the admin
 *  actions taken on them (ban/unban/plan changes, from the same
 *  admin_audit_log ticket detail pages already read via getAuditLogForTarget).
 *  Returns null if the user id doesn't exist (deleted, or a bad URL). */
export async function getUserDetailForAdmin(userId: string): Promise<UserDetail | null> {
  const admin = createAdminClient();

  const [{ data: userData }, { data: profile }, tickets, activity] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin.from("profiles").select("plan").eq("id", userId).maybeSingle(),
    listTicketsForUser(userId),
    getAuditLogForTarget("user", userId),
  ]);
  const authUser = userData.user;
  if (!authUser) return null;

  // conversion_usage only ever records office-conversion tools (Word/Excel/
  // PowerPoint <-> PDF) that round-trip through a server — every browser-
  // only tool (merge, split, compress, edit, etc.) never touches the
  // server at all by design, so there's no server-side record of those to
  // show here. See lib/usageLimits.ts's recordUsage and the note on
  // components/DashboardContent.tsx's usage card.
  const [{ count: totalConversions }, { data: usageRows }] = await Promise.all([
    admin.from("conversion_usage").select("id", { count: "exact", head: true }).eq("user_id", userId),
    admin
      .from("conversion_usage")
      .select("tool_slug, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const toolCounts = new Map<string, number>();
  (usageRows ?? []).forEach((row) => {
    const slug = row.tool_slug as string;
    toolCounts.set(slug, (toolCounts.get(slug) ?? 0) + 1);
  });
  const byTool = Array.from(toolCounts.entries())
    .map(([toolSlug, count]) => ({ toolSlug, count }))
    .sort((a, b) => b.count - a.count);
  const recent = (usageRows ?? []).slice(0, 20).map((row) => ({
    toolSlug: row.tool_slug as string,
    createdAt: row.created_at as string,
  }));

  return {
    id: authUser.id,
    email: authUser.email ?? "(no email)",
    fullName: (authUser.user_metadata?.full_name as string | undefined) ?? null,
    avatarUrl: (authUser.user_metadata?.avatar_url as string | undefined) ?? null,
    plan: toPlanId(profile?.plan),
    createdAt: authUser.created_at,
    lastSignInAt: authUser.last_sign_in_at ?? null,
    isBanned: authUser.app_metadata?.banned === true,
    toolUsage: { totalConversions: totalConversions ?? 0, byTool, recent },
    tickets,
    activity,
  };
}
