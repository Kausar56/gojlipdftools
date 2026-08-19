import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentViewerAccess, hasPermission, getFallbackAdminPath } from "@/lib/adminAuth";
import {
  getTicketForAdmin,
  listAssignableStaff,
  listNotesForTicket,
  isTicketFullAccess,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_BADGE_CLASS,
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_BADGE_CLASS,
} from "@/lib/tickets";
import { getAttachmentDeliveryUrl } from "@/lib/cloudinary";
import { getAuditLogForTarget } from "@/lib/auditLog";
import { TicketThread } from "@/components/TicketThread";
import { TicketStatusSelect } from "@/components/TicketStatusSelect";
import { TicketAssignSelect } from "@/components/TicketAssignSelect";
import { TicketCategorySelect } from "@/components/TicketCategorySelect";
import { TicketPrioritySelect } from "@/components/TicketPrioritySelect";
import { TicketNotesButton } from "@/components/TicketNotesButton";
import { TicketActivityHistory } from "@/components/TicketActivityHistory";
import { UserAvatar } from "@/components/UserAvatar";
import {
  replyToTicketAsStaff,
  updateTicketStatus,
  updateTicketCategory,
  updateTicketPriority,
  assignTicket,
  addInternalNote,
} from "../actions";

export const metadata: Metadata = { title: "Ticket" };
export const dynamic = "force-dynamic";

function ControlField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-base-content/40">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function VerticalDivider() {
  return <div className="hidden h-9 w-px shrink-0 self-end bg-base-300 sm:block" aria-hidden="true" />;
}

export default async function AdminTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { access } = await getCurrentViewerAccess();
  if (!hasPermission(access, "tickets:manage")) redirect(getFallbackAdminPath(access));

  const [result, staff, notes, activity] = await Promise.all([
    getTicketForAdmin(id, access),
    listAssignableStaff(),
    listNotesForTicket(id),
    getAuditLogForTarget("ticket", id),
  ]);
  if (!result) notFound();
  const { ticket, messages } = result;
  const fullAccess = isTicketFullAccess(access);

  const displayMessages = messages.map((message) => ({
    ...message,
    attachmentUrl: message.attachmentPublicId
      ? getAttachmentDeliveryUrl(message.attachmentPublicId, message.attachmentResourceType || "image")
      : null,
  }));

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/tickets" className="text-xs text-primary hover:underline">
        ← Back to all tickets
      </Link>

      {/* Header */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
        <div className="flex min-w-0 items-center gap-4">
          <UserAvatar name={ticket.userName} email={ticket.userEmail} avatarUrl={ticket.userAvatarUrl} className="h-12 w-12" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge badge-ghost badge-sm font-mono">{ticket.ticketNumber}</span>
              <span className={`badge badge-sm ${TICKET_STATUS_BADGE_CLASS[ticket.status]}`}>
                {TICKET_STATUS_LABELS[ticket.status]}
              </span>
            </div>
            <h1 className="mt-1 truncate text-xl font-semibold text-base-content">{ticket.subject}</h1>
            <p className="truncate text-xs text-base-content/50">
              {ticket.userName ? `${ticket.userName} · ${ticket.userEmail}` : (ticket.userEmail ?? "Unknown user")}
            </p>
          </div>
        </div>
        <TicketNotesButton notes={notes} addNoteAction={addInternalNote.bind(null, id)} />
      </div>

      {/* Ticket controls — laid out as one horizontal bar so category,
          priority, assignment, and status all read as a single toolbar
          instead of scattered fields. */}
      <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3 rounded-2xl border border-base-300 bg-base-100 p-4">
        <ControlField label="Category">
          <TicketCategorySelect category={ticket.category} updateAction={updateTicketCategory.bind(null, id)} />
        </ControlField>

        {/* Priority and assignment stay admin-only — see
            updateTicketPriority/assignTicket's isTicketFullAccess guards in
            app/admin/tickets/actions.ts. Hidden rather than
            rendered-then-erroring for a scoped Support agent. */}
        {fullAccess ? (
          <>
            <VerticalDivider />
            <ControlField label="Priority">
              <TicketPrioritySelect priority={ticket.priority} updateAction={updateTicketPriority.bind(null, id)} />
            </ControlField>
            <VerticalDivider />
            <ControlField label="Assign to">
              <TicketAssignSelect assignedToId={ticket.assignedToId} staff={staff} assignAction={assignTicket.bind(null, id)} />
            </ControlField>
          </>
        ) : (
          <>
            <VerticalDivider />
            <ControlField label="Priority">
              <span className={`badge badge-sm ${TICKET_PRIORITY_BADGE_CLASS[ticket.priority]}`}>
                {TICKET_PRIORITY_LABELS[ticket.priority]}
              </span>
            </ControlField>
          </>
        )}

        <VerticalDivider />
        <ControlField label="Status">
          <TicketStatusSelect status={ticket.status} updateAction={updateTicketStatus.bind(null, id)} />
        </ControlField>
      </div>

      {/* Chat + activity */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <TicketThread messages={displayMessages} viewerRole="staff" status={ticket.status} replyAction={replyToTicketAsStaff.bind(null, id)} />
        <TicketActivityHistory entries={activity} />
      </div>
    </div>
  );
}
