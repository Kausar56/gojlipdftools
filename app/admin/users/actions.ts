"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentViewerAccess } from "@/lib/adminAuth";
import { logAdminAction } from "@/lib/auditLog";
import type { PlanId } from "@/lib/planLimits";

const VALID_PLANS: PlanId[] = ["free", "pro", "business"];

// A permanent-enough ban: Supabase's admin API takes a duration string, not
// a boolean, so "banned" here means "for the next ~100 years."
const BAN_DURATION = "876000h";

async function requireFullAdmin() {
  const { user, access } = await getCurrentViewerAccess();
  if (!user || access.kind !== "admin") throw new Error("Not authorized.");
  return user;
}

function assertNotSelf(actorId: string, targetUserId: string) {
  if (actorId === targetUserId) throw new Error("You can't do this to your own account.");
}

export async function updateUserPlan(userId: string, formData: FormData) {
  const actor = await requireFullAdmin();
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

export async function banUser(userId: string) {
  const actor = await requireFullAdmin();
  assertNotSelf(actor.id, userId);

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: BAN_DURATION });
  if (error) throw new Error(error.message);

  await logAdminAction({ actorId: actor.id, actorEmail: actor.email, action: "user.ban", targetType: "user", targetId: userId });

  revalidatePath("/admin/users");
}

export async function unbanUser(userId: string) {
  const actor = await requireFullAdmin();

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: "none" });
  if (error) throw new Error(error.message);

  await logAdminAction({ actorId: actor.id, actorEmail: actor.email, action: "user.unban", targetType: "user", targetId: userId });

  revalidatePath("/admin/users");
}

export async function deleteUserAccount(userId: string) {
  const actor = await requireFullAdmin();
  assertNotSelf(actor.id, userId);

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);

  await logAdminAction({ actorId: actor.id, actorEmail: actor.email, action: "user.delete", targetType: "user", targetId: userId });

  revalidatePath("/admin/users");
}
