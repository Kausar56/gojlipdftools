"use client";

import { useState } from "react";
import type { AuditEntry } from "@/lib/auditLog";
import { PaginationControls } from "./PaginationControls";

const PAGE_SIZE = 25;

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

export function AuditLogTable({ entries }: { entries: AuditEntry[] }) {
  const [page, setPage] = useState(0);

  const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageEntries = entries.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div>
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
            {pageEntries.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-base-content/50">
                  No activity recorded yet.
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
