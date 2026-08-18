"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import type { ManagedUser } from "@/lib/userAdmin";
import type { PlanId } from "@/lib/planLimits";
import { describeError, isRedirectError } from "@/lib/errorHelpers";
import { PaginationControls } from "./PaginationControls";

const PAGE_SIZE = 20;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function PlanSelect({
  user,
  updatePlanAction,
}: {
  user: ManagedUser;
  updatePlanAction: (userId: string, formData: FormData) => void | Promise<void>;
}) {
  const [plan, setPlan] = useState(user.plan);
  const [isPending, startTransition] = useTransition();

  // A <select> inside <form action={fn}> that auto-submits on change gets
  // reset to its defaultValue the instant it submits (React's
  // requestFormReset), snapping the dropdown back to the old plan even
  // though the save went through — a reload shows the correct plan. Calling
  // the action directly (no <form>) skips that reset.
  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value as PlanId;
    const previous = plan;
    setPlan(value);
    const formData = new FormData();
    formData.set("plan", value);
    startTransition(async () => {
      try {
        await updatePlanAction(user.id, formData);
        toast.success(`${user.email}'s plan changed to ${value}.`);
      } catch (error) {
        setPlan(previous);
        toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't change the plan."));
      }
    });
  }

  return (
    <select
      value={plan}
      onChange={handleChange}
      disabled={isPending}
      className="select select-bordered select-xs capitalize"
    >
      <option value="free">Free</option>
      <option value="pro">Pro</option>
      <option value="business">Business</option>
    </select>
  );
}

function BanToggleButton({
  user,
  banAction,
  unbanAction,
}: {
  user: ManagedUser;
  banAction: (userId: string) => void | Promise<void>;
  unbanAction: (userId: string) => void | Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        if (user.isBanned) {
          await unbanAction(user.id);
          toast.success(`${user.email} unbanned.`);
        } else {
          await banAction(user.id);
          toast.success(`${user.email} banned.`);
        }
      } catch (error) {
        toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't update the ban status."));
      }
    });
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className="text-sm text-primary hover:underline">
      {user.isBanned ? "Unban" : "Ban"}
    </button>
  );
}

function DeleteUserButton({ user, deleteAction }: { user: ManagedUser; deleteAction: (userId: string) => void | Promise<void> }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm(`Permanently delete ${user.email}? This can't be undone.`)) return;
    startTransition(async () => {
      try {
        await deleteAction(user.id);
        toast.success(`${user.email} deleted.`);
      } catch (error) {
        if (isRedirectError(error)) throw error;
        toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't delete this user."));
      }
    });
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className="text-sm text-error hover:underline">
      Delete
    </button>
  );
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
                  <td className="max-w-48 truncate">{user.email}</td>
                  <td>
                    {canManage && updatePlanAction ? (
                      <PlanSelect user={user} updatePlanAction={updatePlanAction} />
                    ) : (
                      <span className="badge badge-neutral badge-sm capitalize">{user.plan}</span>
                    )}
                  </td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td>
                    {user.isBanned ? (
                      <span className="badge badge-error badge-sm">Banned</span>
                    ) : (
                      <span className="badge badge-ghost badge-sm">Active</span>
                    )}
                  </td>
                  {canManage && banAction && unbanAction && deleteAction && (
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-3">
                        <BanToggleButton user={user} banAction={banAction} unbanAction={unbanAction} />
                        <DeleteUserButton user={user} deleteAction={deleteAction} />
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
