"use client";

import { useState } from "react";
import Link from "next/link";
import {
  TICKET_STATUS_LABELS,
  TICKET_STATUS_BADGE_CLASS,
  TICKET_STATUSES,
  type Ticket,
  type TicketStatus,
} from "@/lib/tickets";
import { PaginationControls } from "./PaginationControls";

const PAGE_SIZE = 20;
type StatusFilter = TicketStatus | "all";

export function AdminTicketsTable({ tickets }: { tickets: Ticket[] }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const byStatus = statusFilter === "all" ? tickets : tickets.filter((ticket) => ticket.status === statusFilter);
  const filtered = search.trim()
    ? byStatus.filter(
        (ticket) =>
          ticket.subject.toLowerCase().includes(search.trim().toLowerCase()) ||
          (ticket.userEmail ?? "").toLowerCase().includes(search.trim().toLowerCase()),
      )
    : byStatus;

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageTickets = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  function selectFilter(next: StatusFilter) {
    setStatusFilter(next);
    setPage(0);
  }

  return (
    <div>
      <div role="tablist" className="tabs tabs-box mt-4 w-fit">
        <button
          type="button"
          role="tab"
          onClick={() => selectFilter("all")}
          className={`tab ${statusFilter === "all" ? "tab-active" : ""}`}
        >
          All <span className="ml-1 text-xs opacity-60">({tickets.length})</span>
        </button>
        {TICKET_STATUSES.map((status) => {
          const count = tickets.filter((ticket) => ticket.status === status).length;
          return (
            <button
              key={status}
              type="button"
              role="tab"
              onClick={() => selectFilter(status)}
              className={`tab ${statusFilter === status ? "tab-active" : ""}`}
            >
              {TICKET_STATUS_LABELS[status]} <span className="ml-1 text-xs opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      <input
        type="text"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(0);
        }}
        placeholder="Search by subject or user email..."
        className="input input-bordered input-sm mt-4 w-full sm:max-w-xs"
      />

      <div className="mt-4 overflow-x-auto rounded-lg border border-base-300 bg-base-100">
        <table className="table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>User</th>
              <th>Status</th>
              <th>Updated</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {pageTickets.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-base-content/50">
                  {tickets.length === 0 ? "No tickets yet." : "No tickets match."}
                </td>
              </tr>
            ) : (
              pageTickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td className="max-w-xs truncate">{ticket.subject}</td>
                  <td className="max-w-40 truncate text-sm text-base-content/70">{ticket.userEmail ?? "—"}</td>
                  <td>
                    <span className={`badge badge-sm ${TICKET_STATUS_BADGE_CLASS[ticket.status]}`}>
                      {TICKET_STATUS_LABELS[ticket.status]}
                    </span>
                  </td>
                  <td>{new Date(ticket.updatedAt).toLocaleDateString()}</td>
                  <td className="text-right">
                    <Link href={`/admin/tickets/${ticket.id}`} className="text-sm text-primary hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <PaginationControls
        currentPage={currentPage}
        pageCount={pageCount}
        onPrevious={() => setPage((p) => Math.max(0, p - 1))}
        onNext={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
      />
    </div>
  );
}
