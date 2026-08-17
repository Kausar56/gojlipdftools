import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentViewerAccess } from "@/lib/adminAuth";
import { getRecentAuditLog } from "@/lib/auditLog";

export const metadata: Metadata = { title: "Audit Log" };
export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function describeEntry(entry: { targetType: string | null; targetId: string | null; details: Record<string, unknown> | null }) {
  const parts: string[] = [];
  if (entry.targetType) parts.push(entry.targetType);
  if (entry.targetId) parts.push(`#${entry.targetId.slice(0, 8)}`);
  if (entry.details && Object.keys(entry.details).length > 0) {
    parts.push(JSON.stringify(entry.details));
  }
  return parts.join(" ");
}

export default async function AuditLogPage() {
  const { access } = await getCurrentViewerAccess();
  if (access.kind !== "admin") redirect("/admin/blog");

  const entries = await getRecentAuditLog();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-base-content">Audit Log</h1>
      <p className="mt-1 text-sm text-base-content/60">Most recent {entries.length} admin/moderator actions.</p>

      <div className="mt-4 overflow-x-auto rounded-lg border border-base-300 bg-base-100">
        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-base-content/50">
                  No activity recorded yet.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="whitespace-nowrap text-sm text-base-content/70">{formatDate(entry.createdAt)}</td>
                  <td className="max-w-40 truncate text-sm">{entry.actorEmail ?? "(unknown)"}</td>
                  <td>
                    <span className="badge badge-neutral badge-sm">{entry.action}</span>
                  </td>
                  <td className="max-w-xs truncate text-xs text-base-content/60" title={describeEntry(entry)}>
                    {describeEntry(entry)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
