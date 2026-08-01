import type { AdminStats } from "@/lib/adminStats";

export function AdminStatsView({ stats }: { stats: AdminStats }) {
  const totalByTool = stats.byTool.reduce((sum, item) => sum + item.count, 0);
  const totalPlanUsers = stats.planCounts.free + stats.planCounts.pro + stats.planCounts.business;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-base-content">Statistics</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="card border border-base-300 bg-base-100 p-4">
          <p className="text-sm font-medium text-base-content">Plan breakdown</p>
          <div className="mt-3 space-y-2">
            {(["free", "pro", "business"] as const).map((plan) => {
              const count = stats.planCounts[plan];
              const pct = totalPlanUsers ? Math.round((count / totalPlanUsers) * 100) : 0;
              return (
                <div key={plan}>
                  <div className="flex items-center justify-between text-xs text-base-content/70">
                    <span className="capitalize">{plan}</span>
                    <span>
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-base-200">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card border border-base-300 bg-base-100 p-4">
          <p className="text-sm font-medium text-base-content">Conversions</p>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-base-content/70">This month</span>
              <span className="font-semibold text-base-content">{stats.conversionsThisMonth}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-base-content/70">All-time</span>
              <span className="font-semibold text-base-content">{stats.conversionsAllTime}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-base-content">Usage by tool</h2>
        <p className="mt-1 text-xs text-base-content/50">
          Only tools that upload to a server (CloudConvert-based conversions, Compress PDF&apos;s Advanced mode)
          are recorded here — purely browser-side tools (most of the site) leave no server-side trace to count.
        </p>
        <div className="mt-3 overflow-x-auto rounded-lg border border-base-300 bg-base-100">
          <table className="table">
            <thead>
              <tr>
                <th>Tool</th>
                <th>Conversions</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {stats.byTool.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center text-base-content/50">
                    No conversions recorded yet.
                  </td>
                </tr>
              ) : (
                stats.byTool.map((item) => (
                  <tr key={item.toolSlug}>
                    <td>{item.toolSlug}</td>
                    <td>{item.count}</td>
                    <td>{totalByTool ? ((item.count / totalByTool) * 100).toFixed(1) : "0"}%</td>
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
