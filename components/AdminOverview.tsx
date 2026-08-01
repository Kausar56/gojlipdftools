import Link from "next/link";
import type { AdminStats } from "@/lib/adminStats";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function AdminOverview({ stats }: { stats: AdminStats }) {
  const paidUsers = stats.planCounts.pro + stats.planCounts.business;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-base-content">Dashboard</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card border border-base-300 bg-base-100 p-4">
          <p className="text-xs text-base-content/50">Total users</p>
          <p className="mt-1 text-2xl font-semibold text-base-content">{stats.totalUsers}</p>
        </div>
        <div className="card border border-base-300 bg-base-100 p-4">
          <p className="text-xs text-base-content/50">Paid users</p>
          <p className="mt-1 text-2xl font-semibold text-base-content">{paidUsers}</p>
        </div>
        <div className="card border border-base-300 bg-base-100 p-4">
          <p className="text-xs text-base-content/50">Conversions this month</p>
          <p className="mt-1 text-2xl font-semibold text-base-content">{stats.conversionsThisMonth}</p>
        </div>
        <div className="card border border-base-300 bg-base-100 p-4">
          <p className="text-xs text-base-content/50">Conversions all-time</p>
          <p className="mt-1 text-2xl font-semibold text-base-content">{stats.conversionsAllTime}</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2 text-xs text-base-content/60">
        <span className="badge badge-neutral">Free: {stats.planCounts.free}</span>
        <span className="badge badge-primary">Pro: {stats.planCounts.pro}</span>
        <span className="badge badge-secondary">Business: {stats.planCounts.business}</span>
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-base-content">Recent activity</h2>
          <Link href="/admin/users" className="text-sm text-primary hover:underline">
            View all users
          </Link>
        </div>
        <p className="mt-1 text-xs text-base-content/50">Last {stats.recentActivity.length} server-side conversions.</p>
        <div className="mt-3 overflow-x-auto rounded-lg border border-base-300 bg-base-100">
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Tool</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentActivity.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center text-base-content/50">
                    No activity yet.
                  </td>
                </tr>
              ) : (
                stats.recentActivity.map((row, index) => (
                  <tr key={index}>
                    <td className="truncate">{row.email}</td>
                    <td>{row.toolSlug}</td>
                    <td>{formatDateTime(row.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
