"use client";

import { useTransition } from "react";
import toast from "react-hot-toast";
import type { BannerSettings } from "@/lib/appSettings";
import { describeError } from "@/lib/errorHelpers";

export function BannerEditor({
  banner,
  action,
}: {
  banner: BannerSettings | null;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  // Manual submit, not a plain <form action={fn}> — React resets the form's
  // DOM state the instant it submits (requestFormReset), snapping the
  // "active" checkbox back to whatever it was when this component first
  // mounted even though the save went through (a reload shows the right
  // value). Same fix already applied to ToolStatusManager/AdminUsersTable.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        await action(formData);
        toast.success("Banner saved.");
      } catch (error) {
        toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't save the banner."));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4 rounded-lg border border-base-300 bg-base-100 p-4">
      <label className="block text-sm font-medium text-base-content">
        Message
        <textarea
          name="message"
          defaultValue={banner?.message ?? ""}
          placeholder="e.g. Scheduled maintenance tonight 11pm–12am — some tools may be briefly unavailable."
          rows={2}
          className="textarea textarea-bordered mt-1.5 w-full"
        />
      </label>

      <label className="block text-sm font-medium text-base-content">
        Style
        <select name="type" defaultValue={banner?.type ?? "info"} className="select select-bordered select-sm mt-1.5 w-full">
          <option value="info">Info (blue)</option>
          <option value="warning">Warning (amber)</option>
          <option value="success">Success (green)</option>
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm text-base-content">
        <input type="checkbox" name="active" defaultChecked={banner?.active ?? false} className="checkbox checkbox-sm" />
        Show this banner on every page
      </label>

      <button type="submit" disabled={isPending} className="btn btn-primary btn-sm w-full">
        {isPending ? "Saving..." : "Save Banner"}
      </button>
    </form>
  );
}
