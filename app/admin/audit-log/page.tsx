import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentViewerAccess, hasPermission, getFallbackAdminPath } from "@/lib/adminAuth";
import { getRecentAuditLog } from "@/lib/auditLog";
import { AuditLogTable } from "@/components/AuditLogTable";

export const metadata: Metadata = { title: "Audit Log" };
export const dynamic = "force-dynamic";

// Paginated client-side (see AuditLogTable), same as Users/Blog — a higher
// cap than before now that there's a UI to actually page through it, while
// still bounded so this never becomes an unbounded query.
const FETCH_LIMIT = 500;

export default async function AuditLogPage() {
  const { user, access } = await getCurrentViewerAccess();
  if (!hasPermission(access, "audit_log:view_own")) redirect(getFallbackAdminPath(access));

  // A real admin sees every actor's actions; a moderator only granted
  // "audit_log:view_own" sees just their own — same "own" scoping already
  // used for a moderator's blog edit/delete permissions.
  const entries = await getRecentAuditLog(
    access.kind === "admin" ? { limit: FETCH_LIMIT } : { limit: FETCH_LIMIT, actorId: user?.id },
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold text-base-content">Audit Log</h1>
      <p className="mt-1 text-sm text-base-content/60">
        {access.kind === "admin"
          ? `Most recent ${entries.length} admin/moderator actions.`
          : `Your ${entries.length} most recent actions.`}
      </p>

      <AuditLogTable entries={entries} />
    </div>
  );
}
