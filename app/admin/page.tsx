import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminStats } from "@/lib/adminStats";
import { getCurrentViewerAccess, hasPermission } from "@/lib/adminAuth";
import { AdminOverview } from "@/components/AdminOverview";
import { describeError } from "@/lib/errorHelpers";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const { access } = await getCurrentViewerAccess();
  if (!hasPermission(access, "dashboard:view")) redirect("/admin/blog");

  try {
    const stats = await getAdminStats();
    return <AdminOverview stats={stats} />;
  } catch (error) {
    return (
      <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
        {describeError(error, error instanceof Error ? error.message : "Couldn't load dashboard data.")}
      </p>
    );
  }
}
