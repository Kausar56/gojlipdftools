"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import type { PlanId } from "@/lib/planLimits";
import { describeError } from "@/lib/errorHelpers";

/** Shared by AdminUsersTable's row and the single-user detail page — takes
 *  plain id/email/plan rather than a ManagedUser/UserDetail object so either
 *  caller's shape works without adapting. */
export function UserPlanSelect({
  userId,
  userEmail,
  plan,
  updatePlanAction,
}: {
  userId: string;
  userEmail: string;
  plan: PlanId;
  updatePlanAction: (userId: string, formData: FormData) => void | Promise<void>;
}) {
  const [value, setValue] = useState(plan);
  const [isPending, startTransition] = useTransition();

  // A <select> inside <form action={fn}> that auto-submits on change gets
  // reset to its defaultValue the instant it submits (React's
  // requestFormReset), snapping the dropdown back to the old plan even
  // though the save went through — a reload shows the correct plan. Calling
  // the action directly (no <form>) skips that reset.
  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value as PlanId;
    const previous = value;
    setValue(next);
    const formData = new FormData();
    formData.set("plan", next);
    startTransition(async () => {
      try {
        await updatePlanAction(userId, formData);
        toast.success(`${userEmail}'s plan changed to ${next}.`);
      } catch (error) {
        setValue(previous);
        toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't change the plan."));
      }
    });
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      disabled={isPending}
      className="select select-bordered select-xs capitalize"
    >
      <option value="free">Free</option>
      <option value="pro">Pro</option>
      <option value="business">Business</option>
    </select>
  );
}
