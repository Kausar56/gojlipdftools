"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentViewerAccess, hasPermission } from "@/lib/adminAuth";
import { logAdminAction } from "@/lib/auditLog";
import type { PlanId } from "@/lib/planLimits";

const VALID_PLANS: PlanId[] = ["free", "pro", "business"];

// A real admin always qualifies (hasPermission's built-in bypass); a
// moderator/staff member needs "users:manage" granted explicitly — plain
// "users:view" only gets the read-only list, enforced again here since the
// UI hiding these buttons isn't itself a security boundary.
async function requireUserManagement() {
  const { user, access } = await getCurrentViewerAccess();
  if (!user || !hasPermission(access, "users:manage")) throw new Error("Not authorized.");
  return user;
}

function assertNotSelf(actorId: string, targetUserId: string) {
  if (actorId === targetUserId) throw new Error("You can't do this to your own account.");
}

// Merges rather than replaces app_metadata — Supabase also stores its own
// fields there for OAuth accounts (e.g. `provider`/`providers`), and the
// admin API's updateUserById does not merge on its own, so replacing
// app_metadata wholesale would silently wipe those out.
async function setBannedFlag(admin: ReturnType<typeof createAdminClient>, userId: string, banned: boolean) {
  const { data } = await admin.auth.admin.getUserById(userId);
  const appMetadata = { ...(data.user?.app_metadata ?? {}), banned };
  const { error } = await admin.auth.admin.updateUserById(userId, { app_metadata: appMetadata });
  if (error) throw new Error(error.message);
}

export async function updateUserPlan(userId: string, formData: FormData) {
  const actor = await requireUserManagement();
  const plan = String(formData.get("plan") ?? "");
  if (!VALID_PLANS.includes(plan as PlanId)) throw new Error("Invalid plan.");

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ plan }).eq("id", userId);
  if (error) throw new Error(error.message);

  await logAdminAction({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "user.plan_change",
    targetType: "user",
    targetId: userId,
    details: { plan },
  });

  revalidatePath("/admin/users");
}

// An app_metadata flag rather than Supabase's native ban_duration: a native
// ban rejects sign-in and session refresh outright at the Auth-provider
// level, which would eventually log a banned user out entirely (as soon as
// their access token needs refreshing) — the opposite of what's wanted here.
// A banned user should still be able to log in and reach their dashboard
// (to see why, and to message support about it — see DashboardContent.tsx
// and app/dashboard/tickets); only *tool* pages are blocked, enforced in
// proxy.ts by reading this same flag off the verified user record.
export async function banUser(userId: string) {
  const actor = await requireUserManagement();
  assertNotSelf(actor.id, userId);

  const admin = createAdminClient();
  await setBannedFlag(admin, userId, true);

  await logAdminAction({ actorId: actor.id, actorEmail: actor.email, action: "user.ban", targetType: "user", targetId: userId });

  revalidatePath("/admin/users");
}

export async function unbanUser(userId: string) {
  const actor = await requireUserManagement();

  const admin = createAdminClient();
  await setBannedFlag(admin, userId, false);

  await logAdminAction({ actorId: actor.id, actorEmail: actor.email, action: "user.unban", targetType: "user", targetId: userId });

  revalidatePath("/admin/users");
}

export async function deleteUserAccount(userId: string) {
  const actor = await requireUserManagement();
  assertNotSelf(actor.id, userId);

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);

  await logAdminAction({ actorId: actor.id, actorEmail: actor.email, action: "user.delete", targetType: "user", targetId: userId });

  revalidatePath("/admin/users");
}
