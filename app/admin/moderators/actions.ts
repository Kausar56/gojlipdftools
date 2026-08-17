"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentViewerAccess } from "@/lib/adminAuth";
import { logAdminAction } from "@/lib/auditLog";
import { isModeratorPermission, type ModeratorPermission } from "@/lib/permissions";

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

export async function grantModerator(formData: FormData) {
  const admin_user = await requireFullAdmin();
  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) throw new Error("Choose a user first.");
  const permissions = parsePermissions(formData);

  const admin = createAdminClient();
  const { error } = await admin
    .from("moderators")
    .upsert({ id: userId, permissions, granted_by: admin_user.id });
  if (error) throw new Error(error.message);

  await logAdminAction({
    actorId: admin_user.id,
    actorEmail: admin_user.email,
    action: "moderator.grant",
    targetType: "user",
    targetId: userId,
    details: { permissions },
  });

  revalidatePath("/admin/moderators");
}

export async function updateModeratorPermissions(userId: string, formData: FormData) {
  const admin_user = await requireFullAdmin();
  const permissions = parsePermissions(formData);

  const admin = createAdminClient();
  const { error } = await admin.from("moderators").update({ permissions }).eq("id", userId);
  if (error) throw new Error(error.message);

  await logAdminAction({
    actorId: admin_user.id,
    actorEmail: admin_user.email,
    action: "moderator.update",
    targetType: "user",
    targetId: userId,
    details: { permissions },
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
