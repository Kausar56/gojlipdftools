"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { TICKET_PRIORITY_LABELS, TICKET_PRIORITIES, type TicketPriority } from "@/lib/tickets";
import { describeError } from "@/lib/errorHelpers";

export function TicketPrioritySelect({
  priority,
  updateAction,
}: {
  priority: TicketPriority;
  updateAction: (formData: FormData) => void | Promise<void>;
}) {
  const [value, setValue] = useState(priority);
  const [isPending, startTransition] = useTransition();

  // Same manual-submit pattern as TicketStatusSelect — see that component
  // for why a plain auto-submitting <select> would desync its own value.
  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value as TicketPriority;
    const previous = value;
    setValue(next);
    const formData = new FormData();
    formData.set("priority", next);
    startTransition(async () => {
      try {
        await updateAction(formData);
        toast.success(`Priority set to ${TICKET_PRIORITY_LABELS[next]}.`);
      } catch (error) {
        setValue(previous);
        toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't change the priority."));
      }
    });
  }

  return (
    <select value={value} onChange={handleChange} disabled={isPending} className="select select-bordered select-sm">
      {TICKET_PRIORITIES.map((p) => (
        <option key={p} value={p}>
          {TICKET_PRIORITY_LABELS[p]}
        </option>
      ))}
    </select>
  );
}
