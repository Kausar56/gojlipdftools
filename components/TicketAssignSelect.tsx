"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import type { AssignableStaff } from "@/lib/tickets";
import { describeError } from "@/lib/errorHelpers";

const UNASSIGNED = "";

export function TicketAssignSelect({
  assignedToId,
  staff,
  assignAction,
}: {
  assignedToId: string | null;
  staff: AssignableStaff[];
  assignAction: (formData: FormData) => void | Promise<void>;
}) {
  const [value, setValue] = useState(assignedToId ?? UNASSIGNED);
  const [isPending, startTransition] = useTransition();

  // Same manual-submit pattern as TicketStatusSelect — a <select> that
  // auto-submits on change would otherwise get its DOM value reset the
  // instant it submits (React 19's requestFormReset), snapping back to the
  // old assignee even though the save went through.
  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value;
    const previous = value;
    setValue(next);
    const formData = new FormData();
    formData.set("assigneeId", next);
    startTransition(async () => {
      try {
        await assignAction(formData);
        const label = staff.find((member) => member.id === next)?.label;
        toast.success(next ? `Assigned to ${label}.` : "Unassigned.");
      } catch (error) {
        setValue(previous);
        toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't change the assignee."));
      }
    });
  }

  return (
    <select value={value} onChange={handleChange} disabled={isPending} className="select select-bordered select-sm">
      <option value={UNASSIGNED}>Unassigned</option>
      {staff.map((member) => (
        <option key={member.id} value={member.id}>
          {member.label}
        </option>
      ))}
    </select>
  );
}
