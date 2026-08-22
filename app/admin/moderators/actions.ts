"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentViewerAccess } from "@/lib/adminAuth";
import { logAdminAction, getAuditLogForTarget, type AuditEntry } from "@/lib/auditLog";
import { isModeratorPermission, isModeratorRole, type ModeratorPermission } from "@/lib/permissions";

// Only a real admin (never a moderator) can grant, change, or revoke
// moderator access — moderators can't manage each other or themselves.
async function requireFullAdmin() {
  const { user, access } = await getCurrentViewerAccess();
  if (!user || access.kind !== "admin") throw new Error("Not authorized.");
  return user;
}

function parsePermissions(formData: FormData): ModeratorPermission[] {
  return formData
    .getAll("permissions")
    .map(String)
    .filter((value): value is ModeratorPermission => isModeratorPermission(value));
}

function parseRole(formData: FormData) {
  const value = String(formData.get("role") ?? "");
  return isModeratorRole(value) ? value : "moderator";
}

export async function grantModerator(formData: FormData) {
  const admin_user = await requireFullAdmin();
  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) throw new Error("Choose a user first.");
  const permissions = parsePermissions(formData);
  const role = parseRole(formData);

  const admin = createAdminClient();
  const { error } = await admin
    .from("moderators")
    .upsert({ id: userId, permissions, role, granted_by: admin_user.id });
  if (error) throw new Error(error.message);

  await logAdminAction({
    actorId: admin_user.id,
    actorEmail: admin_user.email,
    action: "moderator.grant",
    targetType: "user",
    targetId: userId,
    details: { role, permissions },
  });

  revalidatePath("/admin/moderators");
}

export async function updateModeratorPermissions(userId: string, formData: FormData) {
  const admin_user = await requireFullAdmin();
  const permissions = parsePermissions(formData);
  const role = parseRole(formData);

  const admin = createAdminClient();
  const { error } = await admin.from("moderators").update({ permissions, role }).eq("id", userId);
  if (error) throw new Error(error.message);

  await logAdminAction({
    actorId: admin_user.id,
    actorEmail: admin_user.email,
    action: "moderator.update",
    targetType: "user",
    targetId: userId,
    details: { role, permissions },
  });

  revalidatePath("/admin/moderators");
}

export async function revokeModerator(userId: string) {
  const admin_user = await requireFullAdmin();

  const admin = createAdminClient();
  const { error } = await admin.from("moderators").delete().eq("id", userId);
  if (error) throw new Error(error.message);

  await logAdminAction({
    actorId: admin_user.id,
    actorEmail: admin_user.email,
    action: "moderator.revoke",
    targetType: "user",
    targetId: userId,
  });

  revalidatePath("/admin/moderators");
}

// "Disable access" revokes admin panel access instantly (see
// lib/adminAuth.ts's resolveViewerAccess) without deleting the grant, so
// re-enabling restores the exact same role/permissions — distinct from
// revokeModerator above, which deletes the row entirely, and from
// suspending a *user* account (app/admin/users/actions.ts's banUser), which
// only affects using the product as a customer, not admin panel access.
export async function disableTeamMember(userId: string) {
  const admin_user = await requireFullAdmin();

  const admin = createAdminClient();
  const { error } = await admin.from("moderators").update({ disabled: true }).eq("id", userId);
  if (error) throw new Error(error.message);

  await logAdminAction({ actorId: admin_user.id, actorEmail: admin_user.email, action: "moderator.disable", targetType: "user", targetId: userId });

  revalidatePath("/admin/moderators");
}

export async function enableTeamMember(userId: string) {
  const admin_user = await requireFullAdmin();

  const admin = createAdminClient();
  const { error } = await admin.from("moderators").update({ disabled: false }).eq("id", userId);
  if (error) throw new Error(error.message);

  await logAdminAction({ actorId: admin_user.id, actorEmail: admin_user.email, action: "moderator.enable", targetType: "user", targetId: userId });

  revalidatePath("/admin/moderators");
}

/** Sends the team member Supabase's normal "reset your password" email —
 *  same resetPasswordForEmail flow as components/ForgotPasswordForm.tsx's
 *  self-service one, just triggered by an admin on someone else's behalf. */
export async function resetTeamMemberPassword(userId: string) {
  const admin_user = await requireFullAdmin();

  const admin = createAdminClient();
  const { data, error: lookupError } = await admin.auth.admin.getUserById(userId);
  if (lookupError || !data.user?.email) throw new Error("Couldn't find this team member's email.");

  const { error } = await admin.auth.resetPasswordForEmail(data.user.email, {
    redirectTo: "https://www.gojli.com/auth/callback?next=/reset-password",
  });
  if (error) throw new Error(error.message);

  await logAdminAction({
    actorId: admin_user.id,
    actorEmail: admin_user.email,
    action: "moderator.reset_password",
    targetType: "user",
    targetId: userId,
  });
}

/** Fetched on demand when the "View activity" modal opens (see
 *  components/TeamActivityModal.tsx) rather than upfront for every row on
 *  the team list — most rows' history never gets looked at. Reuses the same
 *  admin_audit_log entries (targetType "user") that the Users detail page's
 *  Activity History reads, since every moderator.* action already logs
 *  against the person's user id. */
export async function getTeamMemberActivity(userId: string): Promise<AuditEntry[]> {
  await requireFullAdmin();
  return getAuditLogForTarget("user", userId);
}
