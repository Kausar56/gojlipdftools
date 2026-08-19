import type { AuditEntry } from "@/lib/auditLog";
import { TICKET_STATUS_LABELS, TICKET_CATEGORY_LABELS, TICKET_PRIORITY_LABELS, isTicketStatus, isTicketCategory, isTicketPriority } from "@/lib/tickets";

function describeActivity(entry: AuditEntry): string {
  const actor = entry.actorEmail ?? "Someone";
  const details = entry.details ?? {};
  switch (entry.action) {
    case "ticket.reply":
      return `${actor} replied`;
    case "ticket.status_change": {
      const status = String(details.status ?? "");
      return `${actor} changed status to ${isTicketStatus(status) ? TICKET_STATUS_LABELS[status] : status}`;
    }
    case "ticket.category_change": {
      const category = details.category ? String(details.category) : null;
      return `${actor} set category to ${category && isTicketCategory(category) ? TICKET_CATEGORY_LABELS[category] : "None"}`;
    }
    case "ticket.priority_change": {
      const priority = String(details.priority ?? "");
      return `${actor} set priority to ${isTicketPriority(priority) ? TICKET_PRIORITY_LABELS[priority] : priority}`;
    }
    case "ticket.assign":
      return details.assigneeId ? `${actor} assigned this ticket` : `${actor} unassigned this ticket`;
    case "ticket.note":
      return `${actor} added an internal note`;
    default:
      return `${actor} — ${entry.action}`;
  }
}

/** Read-only feed built from admin_audit_log entries already written by
 *  every ticket mutation (see app/admin/tickets/actions.ts) — no separate
 *  events table needed. Staff-facing only, same as Internal Notes. Same
 *  34rem height as the chat panel beside it (see TicketThread) so the two
 *  cards line up instead of one trailing off short. */
export function TicketActivityHistory({ entries }: { entries: AuditEntry[] }) {
  return (
    <div className="flex h-136 flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm">
      <p className="shrink-0 border-b border-base-300 px-4 py-3 text-sm font-medium text-base-content">Activity History</p>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {entries.length === 0 ? (
          <p className="py-10 text-center text-xs text-base-content/40">No activity yet.</p>
        ) : (
          <ul className="space-y-3">
            {entries.map((entry) => (
              <li key={entry.id} className="text-xs text-base-content/60">
                <span className="block text-base-content/80">{describeActivity(entry)}</span>
                {new Date(entry.createdAt).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
