import type { Metadata } from "next";
import { getAdminStats } from "@/lib/adminStats";
import { AdminStatsView } from "@/components/AdminStatsView";
import { describeError } from "@/lib/errorHelpers";

export const metadata: Metadata = { title: "Statistics" };
export const dynamic = "force-dynamic";

export default async function AdminStatsPage() {
  try {
    const stats = await getAdminStats();
    return <AdminStatsView stats={stats} />;
  } catch (error) {
    return (
      <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
        {describeError(error, error instanceof Error ? error.message : "Couldn't load statistics.")}
      </p>
    );
  }
}
