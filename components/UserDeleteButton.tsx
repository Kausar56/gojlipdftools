"use client";

import { useTransition } from "react";
import toast from "react-hot-toast";
import { describeError, isRedirectError } from "@/lib/errorHelpers";

/** Shared by AdminUsersTable's row and the single-user detail page — takes
 *  plain id/email rather than a ManagedUser/UserDetail object so either
 *  caller's shape works without adapting. */
export function UserDeleteButton({
  userId,
  userEmail,
  deleteAction,
  label = "Delete",
  className = "text-sm text-error hover:underline",
  onDeleted,
}: {
  userId: string;
  userEmail: string;
  deleteAction: (userId: string) => void | Promise<void>;
  label?: string;
  className?: string;
  /** The list page just lets the row disappear on revalidation; the detail
   *  page (there's no user left to show once this succeeds) passes this to
   *  navigate away — e.g. `() => router.push("/admin/users")`. */
  onDeleted?: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm(`Permanently delete ${userEmail}? This can't be undone.`)) return;
    startTransition(async () => {
      try {
        await deleteAction(userId);
        toast.success(`${userEmail} deleted.`);
        onDeleted?.();
      } catch (error) {
        if (isRedirectError(error)) throw error;
        toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't delete this user."));
      }
    });
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className={className}>
      {label}
    </button>
  );
}
