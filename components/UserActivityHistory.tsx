import type { AuditEntry } from "@/lib/auditLog";

// Also covers app/admin/moderators/actions.ts's moderator.* actions — a team
// member is still a "user" underneath, and every moderator.* action already
// logs against that same user id, so components/TeamActivityModal.tsx reuses
// this whole component for "View activity" instead of a separate one.
function describeActivity(entry: AuditEntry): string {
  const actor = entry.actorEmail ?? "Someone";
  const details = entry.details ?? {};
  switch (entry.action) {
    case "user.ban":
      return `${actor} suspended this account`;
    case "user.unban":
      return `${actor} reactivated this account`;
    case "user.plan_change":
      return `${actor} changed the plan to ${String(details.plan ?? "?")}`;
    case "user.delete":
      return `${actor} deleted this account`;
    case "moderator.grant":
      return `${actor} added them to the team as ${String(details.role ?? "?")}`;
    case "moderator.update":
      return `${actor} updated their team role to ${String(details.role ?? "?")}`;
    case "moderator.revoke":
      return `${actor} removed them from the team`;
    case "moderator.disable":
      return `${actor} disabled their admin panel access`;
    case "moderator.enable":
      return `${actor} re-enabled their admin panel access`;
    case "moderator.reset_password":
      return `${actor} sent a password reset email`;
    default:
      return `${actor} — ${entry.action}`;
  }
}

/** Read-only feed of admin actions taken on this account — built from the
 *  same admin_audit_log entries app/admin/users/actions.ts already writes
 *  for every ban/unban/plan change, same reuse as
 *  components/TicketActivityHistory.tsx does for a ticket's history. */
export function UserActivityHistory({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-base-content/50">No admin actions recorded for this account yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {entries.map((entry) => (
        <li key={entry.id} className="text-sm text-base-content/70">
          <span className="text-base-content">{describeActivity(entry)}</span> ·{" "}
          <span className="text-xs text-base-content/50">{new Date(entry.createdAt).toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );
}
