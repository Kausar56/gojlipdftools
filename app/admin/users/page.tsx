import type { Metadata } from "next";
import { getAdminStats } from "@/lib/adminStats";
import { AdminUsersTable } from "@/components/AdminUsersTable";
import { describeError } from "@/lib/errorHelpers";

export const metadata: Metadata = { title: "Users" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  try {
    const stats = await getAdminStats();
    return <AdminUsersTable users={stats.users} />;
  } catch (error) {
    return (
      <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
        {describeError(error, error instanceof Error ? error.message : "Couldn't load users.")}
      </p>
    );
  }
}
