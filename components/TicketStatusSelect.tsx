"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { TICKET_STATUS_LABELS, TICKET_STATUSES, type TicketStatus } from "@/lib/tickets";
import { describeError } from "@/lib/errorHelpers";

export function TicketStatusSelect({
  status,
  updateAction,
}: {
  status: TicketStatus;
  updateAction: (formData: FormData) => void | Promise<void>;
}) {
  const [value, setValue] = useState(status);
  const [isPending, startTransition] = useTransition();

  // Manual submit (not a plain <form action={fn}>) — same requestFormReset
  // desync this app already fixed for its other selects (see
  // AdminUsersTable's PlanSelect): a <select> that auto-submits on change
  // gets its DOM value reset the instant it submits, snapping the dropdown
  // back to the old status even though the save went through.
  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value as TicketStatus;
    const previous = value;
    setValue(next);
    const formData = new FormData();
    formData.set("status", next);
    startTransition(async () => {
      try {
        await updateAction(formData);
        toast.success(`Status changed to ${TICKET_STATUS_LABELS[next]}.`);
      } catch (error) {
        setValue(previous);
        toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't change the status."));
      }
    });
  }

  return (
    <select value={value} onChange={handleChange} disabled={isPending} className="select select-bordered select-sm">
      {TICKET_STATUSES.map((s) => (
        <option key={s} value={s}>
          {TICKET_STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
