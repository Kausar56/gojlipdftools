"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import type { AuditEntry } from "@/lib/auditLog";
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
import { TeamActivityModal } from "./TeamActivityModal";

const ROLE_BADGE_CLASS: Record<ModeratorRole, string> = {
  admin: "badge-primary",
  editor: "badge-accent",
  moderator: "badge-neutral",
  support: "badge-secondary",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatLastLogin(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "Never";
}

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

function AddTeamMemberModal({
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
        toast.success(`${selectedUser?.email ?? "Team member"} added as ${MODERATOR_ROLE_LABELS[role]}.`);
        onClose();
      } catch (error) {
        toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't add this team member."));
      }
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-base-300 bg-base-100 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-base-content">Add a team member</p>
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
            {isPending ? "Adding..." : "Add to Team"}
          </button>
        </form>
      </div>
    </div>
  );
}

function EditRoleRow({
  member,
  updateAction,
  onDone,
}: {
  member: ModeratorInfo;
  updateAction: (userId: string, formData: FormData) => void | Promise<void>;
  onDone: () => void;
}) {
  const [role, setRole] = useState<ModeratorRole>(member.role);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        await updateAction(member.id, formData);
        toast.success(`${member.email}'s access updated.`);
        onDone();
      } catch (error) {
        toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't update this team member."));
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
        <PermissionCheckboxes defaultChecked={member.permissions} />
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

function DisableToggleButton({
  member,
  disableAction,
  enableAction,
}: {
  member: ModeratorInfo;
  disableAction: (userId: string) => void | Promise<void>;
  enableAction: (userId: string) => void | Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        if (member.disabled) {
          await enableAction(member.id);
          toast.success(`${member.email}'s admin access re-enabled.`);
        } else {
          await disableAction(member.id);
          toast.success(`${member.email}'s admin access disabled.`);
        }
      } catch (error) {
        toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't change access."));
      }
    });
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className="text-sm text-primary hover:underline">
      {member.disabled ? "Enable access" : "Disable access"}
    </button>
  );
}

function ResetPasswordButton({
  member,
  resetPasswordAction,
}: {
  member: ModeratorInfo;
  resetPasswordAction: (userId: string) => void | Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm(`Send a password reset email to ${member.email}?`)) return;
    startTransition(async () => {
      try {
        await resetPasswordAction(member.id);
        toast.success(`Reset email sent to ${member.email}.`);
      } catch (error) {
        toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't send the reset email."));
      }
    });
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className="text-sm text-primary hover:underline">
      Reset password
    </button>
  );
}

function RemoveMemberButton({
  member,
  revokeAction,
}: {
  member: ModeratorInfo;
  revokeAction: (userId: string) => void | Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm(`Remove ${member.email} from the team? This can't be undone.`)) return;
    startTransition(async () => {
      try {
        await revokeAction(member.id);
        toast.success(`${member.email} removed from the team.`);
      } catch (error) {
        toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't remove this team member."));
      }
    });
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className="text-sm text-error hover:underline">
      Delete member
    </button>
  );
}

export function TeamManager({
  members,
  candidateUsers,
  grantAction,
  updateAction,
  revokeAction,
  disableAction,
  enableAction,
  resetPasswordAction,
  fetchActivity,
}: {
  members: ModeratorInfo[];
  candidateUsers: SignupUser[];
  grantAction: (formData: FormData) => void | Promise<void>;
  updateAction: (userId: string, formData: FormData) => void | Promise<void>;
  revokeAction: (userId: string) => void | Promise<void>;
  disableAction: (userId: string) => void | Promise<void>;
  enableAction: (userId: string) => void | Promise<void>;
  resetPasswordAction: (userId: string) => void | Promise<void>;
  fetchActivity: (userId: string) => Promise<AuditEntry[]>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div>
      {showAddModal && (
        <AddTeamMemberModal candidateUsers={candidateUsers} grantAction={grantAction} onClose={() => setShowAddModal(false)} />
      )}

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-base-content/80">Team members</h2>
        <button type="button" onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm">
          <ToolIcon name="plus" className="h-4 w-4" />
          Add Team Member
        </button>
      </div>

      <div className="mt-2 overflow-x-auto rounded-lg border border-base-300 bg-base-100">
        <table className="table">
          <thead>
            <tr>
              <th>Name / Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last login</th>
              <th>Date added</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-base-content/50">
                  No team members yet.
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.id}>
                  <td className="max-w-48">
                    {member.fullName && <p className="truncate text-base-content">{member.fullName}</p>}
                    <p className="truncate text-xs text-base-content/60">{member.email}</p>
                  </td>
                  <td>
                    {editingId !== member.id && (
                      <span className={`badge badge-sm ${ROLE_BADGE_CLASS[member.role]}`}>{MODERATOR_ROLE_LABELS[member.role]}</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-sm ${member.disabled ? "badge-error" : "badge-ghost"}`}>
                      {member.disabled ? "Disabled" : "Active"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-sm text-base-content/70">{formatLastLogin(member.lastSignInAt)}</td>
                  <td className="whitespace-nowrap text-sm text-base-content/70">{formatDate(member.createdAt)}</td>
                  <td className="text-right">
                    {editingId === member.id ? (
                      <EditRoleRow member={member} updateAction={updateAction} onDone={() => setEditingId(null)} />
                    ) : (
                      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                        <button type="button" onClick={() => setEditingId(member.id)} className="text-sm text-primary hover:underline">
                          Edit role
                        </button>
                        <DisableToggleButton member={member} disableAction={disableAction} enableAction={enableAction} />
                        <ResetPasswordButton member={member} resetPasswordAction={resetPasswordAction} />
                        <TeamActivityModal memberId={member.id} memberEmail={member.email} fetchActivity={fetchActivity} />
                        <RemoveMemberButton member={member} revokeAction={revokeAction} />
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
