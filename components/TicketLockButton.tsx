"use client";

import { useTransition } from "react";
import toast from "react-hot-toast";
import { describeError } from "@/lib/errorHelpers";

/** Admin-only escalation beyond the normal Status dropdown — see
 *  app/admin/tickets/actions.ts's lockTicket for why this is separate from
 *  just picking "Closed". */
export function TicketLockButton({
  locked,
  lockAction,
  unlockAction,
}: {
  locked: boolean;
  lockAction: () => void | Promise<void>;
  unlockAction: () => void | Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (locked) {
      startTransition(async () => {
        try {
          await unlockAction();
          toast.success("Ticket unlocked — the user can reopen it again.");
        } catch (error) {
          toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't unlock this ticket."));
        }
      });
      return;
    }

    if (
      !window.confirm(
        "Permanently close this ticket? The user will no longer be able to reopen it — they'll need to open a new ticket for further help.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        await lockAction();
        toast.success("Ticket permanently closed.");
      } catch (error) {
        toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't close this ticket."));
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`btn btn-sm ${locked ? "btn-outline" : "btn-outline btn-error"}`}
    >
      {locked ? "Unlock Ticket" : "Permanently Close"}
    </button>
  );
}
