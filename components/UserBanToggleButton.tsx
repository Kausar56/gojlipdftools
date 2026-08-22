"use client";

import { useTransition } from "react";
import toast from "react-hot-toast";
import { describeError } from "@/lib/errorHelpers";

/** Shared by AdminUsersTable's row and the single-user detail page. Labels
 *  default to "Suspend"/"Activate" (matching the account-status wording used
 *  throughout the admin panel); the detail page passes the fuller "Suspend
 *  account"/"Activate account" instead — same underlying action either way
 *  (see app/admin/users/actions.ts). */
export function UserBanToggleButton({
  userId,
  userEmail,
  isBanned,
  banAction,
  unbanAction,
  banLabel = "Suspend",
  unbanLabel = "Activate",
  className = "text-sm text-primary hover:underline",
}: {
  userId: string;
  userEmail: string;
  isBanned: boolean;
  banAction: (userId: string) => void | Promise<void>;
  unbanAction: (userId: string) => void | Promise<void>;
  banLabel?: string;
  unbanLabel?: string;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        if (isBanned) {
          await unbanAction(userId);
          toast.success(`${userEmail} reactivated.`);
        } else {
          await banAction(userId);
          toast.success(`${userEmail} suspended.`);
        }
      } catch (error) {
        toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't update the account status."));
      }
    });
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className={className}>
      {isBanned ? unbanLabel : banLabel}
    </button>
  );
}
