"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { TICKET_CATEGORY_LABELS, TICKET_CATEGORIES, type TicketCategory } from "@/lib/tickets";
import { describeError } from "@/lib/errorHelpers";

const NONE = "";

export function TicketCategorySelect({
  category,
  updateAction,
}: {
  category: TicketCategory | null;
  updateAction: (formData: FormData) => void | Promise<void>;
}) {
  const [value, setValue] = useState(category ?? NONE);
  const [isPending, startTransition] = useTransition();

  // Same manual-submit pattern as TicketStatusSelect — see that component
  // for why a plain auto-submitting <select> would desync its own value.
  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value;
    const previous = value;
    setValue(next);
    const formData = new FormData();
    formData.set("category", next);
    startTransition(async () => {
      try {
        await updateAction(formData);
        toast.success("Category updated.");
      } catch (error) {
        setValue(previous);
        toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't change the category."));
      }
    });
  }

  return (
    <select value={value} onChange={handleChange} disabled={isPending} className="select select-bordered select-sm">
      <option value={NONE}>No category</option>
      {TICKET_CATEGORIES.map((c) => (
        <option key={c} value={c}>
          {TICKET_CATEGORY_LABELS[c]}
        </option>
      ))}
    </select>
  );
}
