"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import {
  MODERATOR_PERMISSIONS,
  MODERATOR_ROLES,
  MODERATOR_ROLE_LABELS,
  MODERATOR_ROLE_PRESETS,
  type ModeratorPermission,
  type ModeratorRole,
} from "@/lib/permissions";
import type { ModeratorInfo, SignupUser } from "@/lib/moderators";
import { describeError } from "@/lib/errorHelpers";
import { ToolIcon } from "./icons";

const ROLE_BADGE_CLASS: Record<ModeratorRole, string> = {
  admin: "badge-primary",
  moderator: "badge-neutral",
  support: "badge-secondary",
};

function RolePicker({ role, onChange }: { role: ModeratorRole; onChange: (role: ModeratorRole) => void }) {
  return (
    <div className="join">
      {MODERATOR_ROLES.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={`btn btn-xs join-item ${role === value ? "btn-primary" : "btn-ghost border border-base-300"}`}
        >
          {MODERATOR_ROLE_LABELS[value]}
        </button>
      ))}
    </div>
  );
}

// Uncontrolled (defaultChecked) on purpose — keyed by role from the parent so
// picking a different role remounts this with that role's preset instead of
// carrying over whatever was checked before. Anything can still be
// individually toggled afterward; the preset is just a starting point.
function PermissionCheckboxes({
  defaultChecked,
  disabled,
}: {
  defaultChecked: ModeratorPermission[];
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      {MODERATOR_PERMISSIONS.map((permission) => (
        <label key={permission.key} className="flex items-center gap-2 text-sm text-base-content/80">
          <input
            type="checkbox"
            name="permissions"
            value={permission.key}
            defaultChecked={defaultChecked.includes(permission.key)}
            disabled={disabled}
            className="checkbox checkbox-sm"
          />
          {permission.label}
        </label>
      ))}
    </div>
  );
}

function permissionLabel(key: ModeratorPermission) {
  return MODERATOR_PERMISSIONS.find((permission) => permission.key === key)?.label ?? key;
}

function AddModeratorModal({
  candidateUsers,
  grantAction,
  onClose,
}: {
  candidateUsers: SignupUser[];
  grantAction: (formData: FormData) => void | Promise<void>;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [role, setRole] = useState<ModeratorRole>("moderator");
  const [isPending, startTransition] = useTransition();

  const filtered = search.trim()
    ? candidateUsers.filter((user) => user.email.toLowerCase().includes(search.trim().toLowerCase()))
    : candidateUsers;
  const selectedUser = candidateUsers.find((user) => user.id === selectedUserId) ?? null;

  // Manual submit (not a plain <form action={fn}>) so a failed grant shows a
  // toast and leaves the modal open to retry, instead of closing either way.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        await grantAction(formData);
        toast.success(`${selectedUser?.email ?? "Staff member"} added as ${MODERATOR_ROLE_LABELS[role]}.`);
        onClose();
      } catch (error) {
        toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't add this staff member."));
      }
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-base-300 bg-base-100 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-base-content">Add a staff member</p>
            <p className="text-xs text-base-content/60">Search a signed-up user by email, pick a role, then fine-tune access.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="btn btn-ghost btn-xs btn-square">
            <ToolIcon name="close" className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto">
          <input type="hidden" name="userId" value={selectedUserId ?? ""} />
          <input type="hidden" name="role" value={role} />

          {selectedUser ? (
            <div className="flex shrink-0 items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
              <span className="truncate text-base-content">{selectedUser.email}</span>
              <button type="button" onClick={() => setSelectedUserId(null)} className="text-xs text-primary hover:underline">
                Change
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by email..."
                autoFocus
                className="input input-bordered input-sm w-full shrink-0"
              />
              <div className="mt-2 max-h-40 shrink-0 overflow-y-auto rounded-lg border border-base-300">
                {filtered.length === 0 ? (
                  <p className="p-3 text-center text-xs text-base-content/50">
                    {candidateUsers.length === 0 ? "No eligible signed-up users to add." : "No users match."}
                  </p>
                ) : (
                  <ul className="divide-y divide-base-200">
                    {filtered.map((user) => (
                      <li key={user.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedUserId(user.id)}
                          className="block w-full truncate px-3 py-1.5 text-left text-sm text-base-content/80 hover:bg-base-200"
                        >
                          {user.email}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          <div className="mt-4 shrink-0">
            <p className="text-sm font-medium text-base-content/80">Role</p>
            <div className="mt-1.5">
              <RolePicker role={role} onChange={setRole} />
            </div>
          </div>

          <div className="mt-4 flex min-h-0 flex-1 flex-col">
            <p className="shrink-0 text-sm font-medium text-base-content/80">Access to grant</p>
            {/* Bounded + independently scrollable so a long permission list
                (grows over time as features are added) can't squeeze the
                search input/results above down to near-zero height. */}
            <div className="mt-1 max-h-40 min-h-0 flex-1 overflow-y-auto rounded-lg border border-base-300 p-2">
              <PermissionCheckboxes key={role} defaultChecked={MODERATOR_ROLE_PRESETS[role]} />
            </div>
          </div>

          <button type="submit" disabled={!selectedUserId || isPending} className="btn btn-primary btn-sm mt-4 w-full shrink-0">
            {isPending ? "Granting..." : "Grant Access"}
          </button>
        </form>
      </div>
    </div>
  );
}

function EditModeratorRow({
  moderator,
  updateAction,
  onDone,
}: {
  moderator: ModeratorInfo;
  updateAction: (userId: string, formData: FormData) => void | Promise<void>;
  onDone: () => void;
}) {
  const [role, setRole] = useState<ModeratorRole>(moderator.role);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        await updateAction(moderator.id, formData);
        toast.success(`${moderator.email}'s access updated.`);
        onDone();
      } catch (error) {
        toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't update this staff member."));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="role" value={role} />
      <p className="text-xs font-medium text-base-content/60">Role</p>
      <div className="mt-1 mb-3">
        <RolePicker role={role} onChange={setRole} />
      </div>
      <p className="text-xs font-medium text-base-content/60">Access</p>
      <div className="mt-1">
        <PermissionCheckboxes defaultChecked={moderator.permissions} />
      </div>
      <div className="mt-2 flex gap-2">
        <button type="submit" disabled={isPending} className="btn btn-primary btn-xs">
          {isPending ? "Saving..." : "Save"}
        </button>
        <button type="button" onClick={onDone} disabled={isPending} className="btn btn-ghost btn-xs">
          Cancel
        </button>
      </div>
    </form>
  );
}

function RemoveStaffButton({
  moderator,
  revokeAction,
}: {
  moderator: ModeratorInfo;
  revokeAction: (userId: string) => void | Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm(`Remove staff access for ${moderator.email}?`)) return;
    startTransition(async () => {
      try {
        await revokeAction(moderator.id);
        toast.success(`${moderator.email}'s staff access removed.`);
      } catch (error) {
        toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't remove this staff member."));
      }
    });
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className="text-sm text-error hover:underline">
      Remove
    </button>
  );
}

export function ModeratorsManager({
  moderators,
  candidateUsers,
  grantAction,
  updateAction,
  revokeAction,
}: {
  moderators: ModeratorInfo[];
  candidateUsers: SignupUser[];
  grantAction: (formData: FormData) => void | Promise<void>;
  updateAction: (userId: string, formData: FormData) => void | Promise<void>;
  revokeAction: (userId: string) => void | Promise<void>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div>
      {showAddModal && (
        <AddModeratorModal
          candidateUsers={candidateUsers}
          grantAction={grantAction}
          onClose={() => setShowAddModal(false)}
        />
      )}

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-base-content/80">Current staff</h2>
        <button type="button" onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm">
          <ToolIcon name="plus" className="h-4 w-4" />
          Add Staff Member
        </button>
      </div>

      <div className="mt-2 overflow-x-auto rounded-lg border border-base-300 bg-base-100">
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Access</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {moderators.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-base-content/50">
                  No staff members yet.
                </td>
              </tr>
            ) : (
              moderators.map((moderator) => (
                <tr key={moderator.id}>
                  <td className="max-w-40 truncate sm:max-w-none">{moderator.email}</td>
                  <td>
                    {editingId !== moderator.id && (
                      <span className={`badge badge-sm ${ROLE_BADGE_CLASS[moderator.role]}`}>
                        {MODERATOR_ROLE_LABELS[moderator.role]}
                      </span>
                    )}
                  </td>
                  <td>
                    {editingId === moderator.id ? (
                      <EditModeratorRow
                        moderator={moderator}
                        updateAction={updateAction}
                        onDone={() => setEditingId(null)}
                      />
                    ) : moderator.permissions.length === 0 ? (
                      <span className="text-xs text-base-content/40">No permissions granted</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {moderator.permissions.map((permission) => (
                          <span key={permission} className="badge badge-neutral badge-sm">
                            {permissionLabel(permission)}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="text-right">
                    {editingId !== moderator.id && (
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setEditingId(moderator.id)}
                          className="text-sm text-primary hover:underline"
                        >
                          Edit
                        </button>
                        <RemoveStaffButton moderator={moderator} revokeAction={revokeAction} />
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
