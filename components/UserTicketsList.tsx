"use client";

import { useState } from "react";
import Link from "next/link";
import { TICKET_STATUS_LABELS, TICKET_STATUS_BADGE_CLASS, type Ticket } from "@/lib/tickets";
import { CreateTicketModal } from "./CreateTicketModal";
import { ToolIcon } from "./icons";

export function UserTicketsList({
  tickets,
  createAction,
}: {
  tickets: Ticket[];
  createAction: (formData: FormData) => Promise<void>;
}) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div>
      {showCreate && <CreateTicketModal createAction={createAction} onClose={() => setShowCreate(false)} />}

      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-base-content">Support Tickets</h1>
          <p className="mt-1 text-sm text-base-content/60">Need help? Open a ticket and our team will get back to you.</p>
        </div>
        <button type="button" onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm shrink-0">
          <ToolIcon name="plus" className="h-4 w-4" />
          Create Ticket
        </button>
      </div>

      {tickets.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-base-300 px-4 py-10 text-center text-sm text-base-content/60">
          No tickets yet — create one if you need help.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-base-300 rounded-lg border border-base-300 bg-base-100">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link
                href={`/dashboard/tickets/${ticket.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-base-200"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs text-base-content/40">{ticket.ticketNumber}</p>
                  <p className="truncate text-sm font-medium text-base-content">{ticket.subject}</p>
                  <p className="text-xs text-base-content/50">Updated {new Date(ticket.updatedAt).toLocaleDateString()}</p>
                </div>
                <span className={`badge badge-sm shrink-0 ${TICKET_STATUS_BADGE_CLASS[ticket.status]}`}>
                  {TICKET_STATUS_LABELS[ticket.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
