"use client";

import { useState } from "react";
import Link from "next/link";
import type { ManagedUser } from "@/lib/userAdmin";
import { PaginationControls } from "./PaginationControls";
import { UserPlanSelect } from "./UserPlanSelect";
import { UserBanToggleButton } from "./UserBanToggleButton";
import { UserDeleteButton } from "./UserDeleteButton";

const PAGE_SIZE = 20;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function AdminUsersTable({
  users,
  canManage,
  updatePlanAction,
  banAction,
  unbanAction,
  deleteAction,
}: {
  users: ManagedUser[];
  canManage: boolean;
  updatePlanAction?: (userId: string, formData: FormData) => void | Promise<void>;
  banAction?: (userId: string) => void | Promise<void>;
  unbanAction?: (userId: string) => void | Promise<void>;
  deleteAction?: (userId: string) => void | Promise<void>;
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
      {!canManage && (
        <p className="mt-1 text-xs text-base-content/50">
          Read-only — plan changes, bans, and deletes are admin-only.
        </p>
      )}

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
              {canManage && <th />}
            </tr>
          </thead>
          <tbody>
            {pageUsers.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 5 : 4} className="text-center text-base-content/50">
                  No users match.
                </td>
              </tr>
            ) : (
              pageUsers.map((user) => (
                <tr key={user.id}>
                  <td className="max-w-48 truncate">
                    <Link href={`/admin/users/${user.id}`} className="text-primary hover:underline">
                      {user.email}
                    </Link>
                  </td>
                  <td>
                    {canManage && updatePlanAction ? (
                      <UserPlanSelect userId={user.id} userEmail={user.email} plan={user.plan} updatePlanAction={updatePlanAction} />
                    ) : (
                      <span className="badge badge-neutral badge-sm capitalize">{user.plan}</span>
                    )}
                  </td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td>
                    {user.isBanned ? (
                      <span className="badge badge-error badge-sm">Suspended</span>
                    ) : (
                      <span className="badge badge-ghost badge-sm">Active</span>
                    )}
                  </td>
                  {canManage && banAction && unbanAction && deleteAction && (
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-3">
                        <UserBanToggleButton
                          userId={user.id}
                          userEmail={user.email}
                          isBanned={user.isBanned}
                          banAction={banAction}
                          unbanAction={unbanAction}
                        />
                        <UserDeleteButton userId={user.id} userEmail={user.email} deleteAction={deleteAction} />
                      </div>
                    </td>
                  )}
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
