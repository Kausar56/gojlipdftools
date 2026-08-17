import { createAdminClient } from "./supabase/admin";
import type { PlanId } from "./planLimits";

export type ManagedUser = {
  id: string;
  email: string;
  plan: PlanId;
  createdAt: string;
  isBanned: boolean;
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
      isBanned: Boolean(user.banned_until) && new Date(user.banned_until as string) > new Date(),
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
