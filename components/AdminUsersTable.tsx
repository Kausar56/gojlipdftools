"use client";

import { useState } from "react";
import type { ManagedUser } from "@/lib/userAdmin";

const PAGE_SIZE = 20;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function AdminUsersTable({
  users,
  updatePlanAction,
  banAction,
  unbanAction,
  deleteAction,
}: {
  users: ManagedUser[];
  updatePlanAction: (userId: string, formData: FormData) => void | Promise<void>;
  banAction: (userId: string) => void | Promise<void>;
  unbanAction: (userId: string) => void | Promise<void>;
  deleteAction: (userId: string) => void | Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = search.trim()
    ? users.filter((user) => user.email.toLowerCase().includes(search.trim().toLowerCase()))
    : users;

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageUsers = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-base-content">Users</h1>
      <p className="mt-1 text-sm text-base-content/60">{users.length} accounts total.</p>

      <input
        type="text"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(0);
        }}
        placeholder="Search by email..."
        className="input input-bordered input-sm mt-4 w-full sm:max-w-xs"
      />

      <div className="mt-4 overflow-x-auto rounded-lg border border-base-300 bg-base-100">
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Plan</th>
              <th>Joined</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {pageUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-base-content/50">
                  No users match.
                </td>
              </tr>
            ) : (
              pageUsers.map((user) => (
                <tr key={user.id}>
                  <td className="max-w-48 truncate">{user.email}</td>
                  <td>
                    <form action={updatePlanAction.bind(null, user.id)}>
                      <select
                        name="plan"
                        defaultValue={user.plan}
                        onChange={(event) => event.currentTarget.form?.requestSubmit()}
                        className="select select-bordered select-xs capitalize"
                      >
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="business">Business</option>
                      </select>
                    </form>
                  </td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td>
                    {user.isBanned ? (
                      <span className="badge badge-error badge-sm">Banned</span>
                    ) : (
                      <span className="badge badge-ghost badge-sm">Active</span>
                    )}
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-3">
                      <form action={(user.isBanned ? unbanAction : banAction).bind(null, user.id)}>
                        <button type="submit" className="text-sm text-primary hover:underline">
                          {user.isBanned ? "Unban" : "Ban"}
                        </button>
                      </form>
                      <form
                        action={deleteAction.bind(null, user.id)}
                        onSubmit={(event) => {
                          if (!window.confirm(`Permanently delete ${user.email}? This can't be undone.`)) {
                            event.preventDefault();
                          }
                        }}
                      >
                        <button type="submit" className="text-sm text-error hover:underline">
                          Delete
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="btn btn-ghost btn-xs"
          >
            Previous
          </button>
          <span className="text-base-content/60">
            Page {currentPage + 1} of {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={currentPage === pageCount - 1}
            className="btn btn-ghost btn-xs"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
