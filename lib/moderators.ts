import { createAdminClient } from "./supabase/admin";
import { isAdminEmail } from "./adminAuth";
import { isModeratorPermission, isModeratorRole, type ModeratorPermission, type ModeratorRole } from "./permissions";

export type ModeratorInfo = {
  id: string;
  email: string;
  fullName: string | null;
  role: ModeratorRole;
  permissions: ModeratorPermission[];
  createdAt: string;
  disabled: boolean;
  lastSignInAt: string | null;
};

export type SignupUser = { id: string; email: string };

/** Admin-only — uses the service-role client so it can list every moderator
 *  row (RLS on `moderators` only lets a user read their own) and resolve
 *  each one's email via the auth admin API. */
export async function listModerators(): Promise<ModeratorInfo[]> {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("moderators")
    .select("id, permissions, role, created_at, disabled")
    .order("created_at", { ascending: false });
  if (!rows || rows.length === 0) return [];

  const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const userById = new Map((usersData?.users ?? []).map((user) => [user.id, user]));

  return rows.map((row) => {
    const roleValue = row.role as string | null;
    const authUser = userById.get(row.id as string);
    return {
      id: row.id as string,
      email: authUser?.email ?? "(unknown)",
      fullName: (authUser?.user_metadata?.full_name as string | undefined) ?? null,
      role: roleValue && isModeratorRole(roleValue) ? roleValue : "moderator",
      permissions: ((row.permissions ?? []) as string[]).filter(isModeratorPermission),
      createdAt: row.created_at as string,
      disabled: Boolean(row.disabled),
      lastSignInAt: authUser?.last_sign_in_at ?? null,
    };
  });
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
