import { createAdminClient } from "./supabase/admin";
import { isAdminEmail } from "./adminAuth";
import { isModeratorPermission, type ModeratorPermission } from "./permissions";

export type ModeratorInfo = {
  id: string;
  email: string;
  permissions: ModeratorPermission[];
  createdAt: string;
};

export type SignupUser = { id: string; email: string };

/** Admin-only — uses the service-role client so it can list every moderator
 *  row (RLS on `moderators` only lets a user read their own) and resolve
 *  each one's email via the auth admin API. */
export async function listModerators(): Promise<ModeratorInfo[]> {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("moderators")
    .select("id, permissions, created_at")
    .order("created_at", { ascending: false });
  if (!rows || rows.length === 0) return [];

  const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailById = new Map((usersData?.users ?? []).map((user) => [user.id, user.email ?? "(no email)"]));

  return rows.map((row) => ({
    id: row.id as string,
    email: emailById.get(row.id as string) ?? "(unknown)",
    permissions: ((row.permissions ?? []) as string[]).filter(isModeratorPermission),
    createdAt: row.created_at as string,
  }));
}

/** Every signed-up user eligible to be picked in the "add a moderator" form —
 *  excludes real admins (they already have full access) and anyone already a
 *  moderator (edit their existing row instead of granting a second time). */
export async function listCandidateUsersForModeratorPicker(): Promise<SignupUser[]> {
  const admin = createAdminClient();
  const [{ data: usersData }, { data: moderatorRows }] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("moderators").select("id"),
  ]);

  const moderatorIds = new Set((moderatorRows ?? []).map((row) => row.id as string));

  return (usersData?.users ?? [])
    .filter((user) => !isAdminEmail(user.email) && !moderatorIds.has(user.id))
    .map((user) => ({ id: user.id, email: user.email ?? "(no email)" }))
    .sort((a, b) => a.email.localeCompare(b.email));
}
