import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUsersForAdmin } from "@/lib/userAdmin";
import { getCurrentViewerAccess, hasPermission, getFallbackAdminPath } from "@/lib/adminAuth";
import { AdminUsersTable } from "@/components/AdminUsersTable";
import { describeError } from "@/lib/errorHelpers";
import { updateUserPlan, banUser, unbanUser, deleteUserAccount } from "./actions";

export const metadata: Metadata = { title: "Users" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const { access } = await getCurrentViewerAccess();
  // "users:manage" implies view too — an admin (or a moderator/staff member
  // granted just that one permission, skipping "users:view") shouldn't get
  // locked out of the list they're also allowed to act on.
  const canManage = hasPermission(access, "users:manage");
  const canView = canManage || hasPermission(access, "users:view");
  if (!canView) redirect(getFallbackAdminPath(access));

  try {
    const users = await getUsersForAdmin();
    return (
      <AdminUsersTable
        users={users}
        canManage={canManage}
        updatePlanAction={canManage ? updateUserPlan : undefined}
        banAction={canManage ? banUser : undefined}
        unbanAction={canManage ? unbanUser : undefined}
        deleteAction={canManage ? deleteUserAccount : undefined}
      />
    );
  } catch (error) {
    return (
      <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
        {describeError(error, error instanceof Error ? error.message : "Couldn't load users.")}
      </p>
    );
  }
}
