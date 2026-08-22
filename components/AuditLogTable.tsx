"use client";

import { useState } from "react";
import type { AuditEntry } from "@/lib/auditLog";
import { PaginationControls } from "./PaginationControls";
import { ToolIcon } from "./icons";

const PAGE_SIZE = 25;

type Filters = { email: string; from: string; to: string };
const EMPTY_FILTERS: Filters = { email: "", from: "", to: "" };

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function describeEntry(entry: Pick<AuditEntry, "targetType" | "targetId" | "details">) {
  const parts: string[] = [];
  if (entry.targetType) parts.push(entry.targetType);
  if (entry.targetId) parts.push(`#${entry.targetId.slice(0, 8)}`);
  if (entry.details && Object.keys(entry.details).length > 0) {
    parts.push(JSON.stringify(entry.details));
  }
  return parts.join(" ");
}

function matchesFilters(entry: AuditEntry, filters: Filters): boolean {
  if (filters.email && !(entry.actorEmail ?? "").toLowerCase().includes(filters.email.toLowerCase())) return false;
  const createdAt = new Date(entry.createdAt).getTime();
  if (filters.from && createdAt < new Date(filters.from).getTime()) return false;
  if (filters.to && createdAt > new Date(filters.to).getTime()) return false;
  return true;
}

export function AuditLogTable({ entries }: { entries: AuditEntry[] }) {
  // Draft fields the admin is typing into, vs. the filters actually applied —
  // kept separate so the list only updates once "Search" is clicked (or
  // Enter pressed), not on every keystroke/date pick.
  const [emailInput, setEmailInput] = useState("");
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(0);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters({ email: emailInput.trim(), from: fromInput, to: toInput });
    setPage(0);
  }

  function handleReset() {
    setEmailInput("");
    setFromInput("");
    setToInput("");
    setFilters(EMPTY_FILTERS);
    setPage(0);
  }

  const hasActiveFilters = filters.email || filters.from || filters.to;
  const filtered = hasActiveFilters ? entries.filter((entry) => matchesFilters(entry, filters)) : entries;

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageEntries = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div>
      <form onSubmit={handleSearch} className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-base-300 bg-base-100 p-4">
        <label className="block text-sm font-medium text-base-content">
          Actor email
          <input
            type="text"
            value={emailInput}
            onChange={(event) => setEmailInput(event.target.value)}
            placeholder="e.g. name@gmail.com"
            className="input input-bordered input-sm mt-1.5 w-56"
          />
        </label>
        <label className="block text-sm font-medium text-base-content">
          From
          <input
            type="datetime-local"
            value={fromInput}
            onChange={(event) => setFromInput(event.target.value)}
            className="input input-bordered input-sm mt-1.5"
          />
        </label>
        <label className="block text-sm font-medium text-base-content">
          To
          <input
            type="datetime-local"
            value={toInput}
            onChange={(event) => setToInput(event.target.value)}
            className="input input-bordered input-sm mt-1.5"
          />
        </label>
        <button type="submit" className="btn btn-primary btn-sm">
          <ToolIcon name="search" className="h-4 w-4" />
          Search
        </button>
        {hasActiveFilters && (
          <button type="button" onClick={handleReset} className="btn btn-ghost btn-sm">
            Clear
          </button>
        )}
      </form>

      {hasActiveFilters && (
        <p className="mt-2 text-xs text-base-content/50">
          {filtered.length} of {entries.length} entries match.
        </p>
      )}

      <div className="mt-4 overflow-x-auto rounded-lg border border-base-300 bg-base-100">
        <table className="table">
          <thead>
            <tr>
              <th>Date &amp; Time</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {pageEntries.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-base-content/50">
                  {entries.length === 0 ? "No activity recorded yet." : "No entries match."}
                </td>
              </tr>
            ) : (
              pageEntries.map((entry) => (
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

      <PaginationControls
        currentPage={currentPage}
        pageCount={pageCount}
        onPrevious={() => setPage((p) => Math.max(0, p - 1))}
        onNext={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
      />
    </div>
  );
}
