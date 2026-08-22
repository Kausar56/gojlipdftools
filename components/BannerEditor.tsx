"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import type { BannerSettings } from "@/lib/appSettings";
import { describeError } from "@/lib/errorHelpers";

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const DISMISS_DURATIONS = [
  { value: "", label: "Until page refresh (not persisted)" },
  { value: "1", label: "1 day" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
];

export function BannerEditor({
  banner,
  action,
}: {
  banner: BannerSettings | null;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [pagesMode, setPagesMode] = useState<"all" | "specific">(banner && Array.isArray(banner.pages) ? "specific" : "all");
  const [dismissible, setDismissible] = useState(banner?.dismissible ?? true);

  // Manual submit, not a plain <form action={fn}> — React resets the form's
  // DOM state the instant it submits (requestFormReset), snapping checkbox/
  // select values back to whatever they were when this component first
  // mounted even though the save went through (a reload shows the right
  // value). Same fix already applied to ToolStatusManager/AdminUsersTable.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("pagesMode", pagesMode);
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

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium text-base-content">
          Style
          <select name="type" defaultValue={banner?.type ?? "info"} className="select select-bordered select-sm mt-1.5 w-full">
            <option value="info">Info (blue)</option>
            <option value="warning">Warning (amber)</option>
            <option value="success">Success (green)</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-base-content">
          Size
          <select name="size" defaultValue={banner?.size ?? "md"} className="select select-bordered select-sm mt-1.5 w-full">
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
          </select>
        </label>
      </div>

      <div>
        <p className="text-sm font-medium text-base-content">Show on</p>
        <div className="mt-1.5 flex gap-4 text-sm text-base-content/80">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="pagesModeRadio"
              checked={pagesMode === "all"}
              onChange={() => setPagesMode("all")}
              className="radio radio-sm"
            />
            All pages
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="pagesModeRadio"
              checked={pagesMode === "specific"}
              onChange={() => setPagesMode("specific")}
              className="radio radio-sm"
            />
            Specific pages
          </label>
        </div>
        {pagesMode === "specific" && (
          <>
            <textarea
              name="pagesList"
              defaultValue={banner && Array.isArray(banner.pages) ? banner.pages.join("\n") : "/"}
              rows={2}
              placeholder={"One path per line, e.g.\n/\n/merge-pdf"}
              className="textarea textarea-bordered textarea-sm mt-2 w-full font-mono"
            />
            <p className="mt-1 text-xs text-base-content/50">
              One path per line. Use <code>/</code> for the homepage. The admin panel never shows a banner regardless of this.
            </p>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium text-base-content">
          Button label (optional)
          <input
            type="text"
            name="ctaLabel"
            defaultValue={banner?.ctaLabel ?? ""}
            placeholder="Learn More"
            className="input input-bordered input-sm mt-1.5 w-full"
          />
        </label>
        <label className="block text-sm font-medium text-base-content">
          Button link
          <input
            type="text"
            name="ctaUrl"
            defaultValue={banner?.ctaUrl ?? ""}
            placeholder="/pricing or https://..."
            className="input input-bordered input-sm mt-1.5 w-full"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium text-base-content">
          Starts (optional)
          <input
            type="datetime-local"
            name="startAt"
            defaultValue={toDatetimeLocalValue(banner?.startAt ?? null)}
            className="input input-bordered input-sm mt-1.5 w-full"
          />
        </label>
        <label className="block text-sm font-medium text-base-content">
          Ends (optional)
          <input
            type="datetime-local"
            name="endAt"
            defaultValue={toDatetimeLocalValue(banner?.endAt ?? null)}
            className="input input-bordered input-sm mt-1.5 w-full"
          />
        </label>
      </div>
      <p className="-mt-2 text-xs text-base-content/50">
        Leave both blank to run indefinitely (as long as it&apos;s active below). Times are your browser&apos;s local time.
      </p>

      <label className="flex items-center gap-2 text-sm text-base-content">
        <input
          type="checkbox"
          name="dismissible"
          checked={dismissible}
          onChange={(event) => setDismissible(event.target.checked)}
          className="checkbox checkbox-sm"
        />
        Let visitors close it with a × button
      </label>
      {dismissible && (
        <label className="-mt-2 block text-sm font-medium text-base-content">
          After closing, stay hidden for
          <select
            name="dismissDurationDays"
            defaultValue={banner?.dismissDurationDays ? String(banner.dismissDurationDays) : ""}
            className="select select-bordered select-sm mt-1.5 w-full"
          >
            {DISMISS_DURATIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex items-center gap-2 text-sm text-base-content">
        <input type="checkbox" name="active" defaultChecked={banner?.active ?? false} className="checkbox checkbox-sm" />
        Banner is active
      </label>

      <button type="submit" disabled={isPending} className="btn btn-primary btn-sm w-full">
        {isPending ? "Saving..." : "Save Banner"}
      </button>
    </form>
  );
}
