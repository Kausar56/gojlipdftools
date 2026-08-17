import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUsersForAdmin } from "@/lib/userAdmin";
import { getCurrentViewerAccess } from "@/lib/adminAuth";
import { AdminUsersTable } from "@/components/AdminUsersTable";
import { describeError } from "@/lib/errorHelpers";
import { updateUserPlan, banUser, unbanUser, deleteUserAccount } from "./actions";

export const metadata: Metadata = { title: "Users" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const { access } = await getCurrentViewerAccess();
  if (access.kind !== "admin") redirect("/admin/blog");

  try {
    const users = await getUsersForAdmin();
    return (
      <AdminUsersTable
        users={users}
        updatePlanAction={updateUserPlan}
        banAction={banUser}
        unbanAction={unbanUser}
        deleteAction={deleteUserAccount}
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
