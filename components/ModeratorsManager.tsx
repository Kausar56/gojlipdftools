"use client";

import { useState } from "react";
import { MODERATOR_PERMISSIONS, type ModeratorPermission } from "@/lib/permissions";
import type { ModeratorInfo, SignupUser } from "@/lib/moderators";
import { ToolIcon } from "./icons";

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

  const filtered = search.trim()
    ? candidateUsers.filter((user) => user.email.toLowerCase().includes(search.trim().toLowerCase()))
    : candidateUsers;
  const selectedUser = candidateUsers.find((user) => user.id === selectedUserId) ?? null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-base-300 bg-base-100 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-base-content">Add a moderator</p>
            <p className="text-xs text-base-content/60">Search a signed-up user by email, then pick their access.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="btn btn-ghost btn-xs btn-square">
            <ToolIcon name="close" className="h-4 w-4" />
          </button>
        </div>

        <form action={grantAction} onSubmit={onClose} className="mt-4 flex min-h-0 flex-1 flex-col">
          <input type="hidden" name="userId" value={selectedUserId ?? ""} />

          {selectedUser ? (
            <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
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
                className="input input-bordered input-sm w-full"
              />
              <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-base-300">
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

          <div className="mt-4">
            <p className="text-sm font-medium text-base-content/80">Access to grant</p>
            <div className="mt-1">
              <PermissionCheckboxes defaultChecked={[]} />
            </div>
          </div>

          <button type="submit" disabled={!selectedUserId} className="btn btn-primary btn-sm mt-4 w-full">
            Grant Access
          </button>
        </form>
      </div>
    </div>
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
        <h2 className="text-sm font-semibold text-base-content/80">Current moderators</h2>
        <button type="button" onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm">
          <ToolIcon name="plus" className="h-4 w-4" />
          Add Moderator
        </button>
      </div>

      <div className="mt-2 overflow-x-auto rounded-lg border border-base-300 bg-base-100">
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Access</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {moderators.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center text-base-content/50">
                  No moderators yet.
                </td>
              </tr>
            ) : (
              moderators.map((moderator) => (
                <tr key={moderator.id}>
                  <td className="max-w-40 truncate sm:max-w-none">{moderator.email}</td>
                  <td>
                    {editingId === moderator.id ? (
                      <form
                        action={(formData) => {
                          updateAction(moderator.id, formData);
                          setEditingId(null);
                        }}
                      >
                        <PermissionCheckboxes defaultChecked={moderator.permissions} />
                        <div className="mt-2 flex gap-2">
                          <button type="submit" className="btn btn-primary btn-xs">
                            Save
                          </button>
                          <button type="button" onClick={() => setEditingId(null)} className="btn btn-ghost btn-xs">
                            Cancel
                          </button>
                        </div>
                      </form>
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
                        <form
                          action={revokeAction.bind(null, moderator.id)}
                          onSubmit={(event) => {
                            if (!window.confirm(`Remove moderator access for ${moderator.email}?`)) {
                              event.preventDefault();
                            }
                          }}
                        >
                          <button type="submit" className="text-sm text-error hover:underline">
                            Remove
                          </button>
                        </form>
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
