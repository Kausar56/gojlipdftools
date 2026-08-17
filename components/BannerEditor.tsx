"use client";

import type { BannerSettings } from "@/lib/appSettings";

export function BannerEditor({
  banner,
  action,
}: {
  banner: BannerSettings | null;
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="max-w-lg space-y-4 rounded-lg border border-base-300 bg-base-100 p-4">
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

      <button type="submit" className="btn btn-primary btn-sm w-full">
        Save Banner
      </button>
    </form>
  );
}
