"use client";

import { useState } from "react";
import type { Tool } from "@/lib/tools";
import type { ToolStatusMap } from "@/lib/appSettings";

function ToolStatusRow({
  tool,
  status,
  action,
}: {
  tool: Tool;
  status: { disabled: boolean; message?: string } | undefined;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [disabled, setDisabled] = useState(status?.disabled ?? false);

  return (
    <form action={action} className="flex flex-col gap-2 border-b border-base-200 py-3 last:border-0 sm:flex-row sm:items-center">
      <label className="flex w-56 shrink-0 items-center gap-2 text-sm text-base-content">
        <input
          type="checkbox"
          name="disabled"
          checked={disabled}
          onChange={(event) => setDisabled(event.target.checked)}
          className="toggle toggle-sm toggle-warning"
        />
        <span className="truncate">{tool.name}</span>
      </label>
      <input
        type="text"
        name="message"
        defaultValue={status?.message ?? ""}
        placeholder="Optional message shown to visitors while disabled"
        className="input input-bordered input-sm flex-1"
      />
      <button type="submit" className="btn btn-outline btn-sm">
        Save
      </button>
    </form>
  );
}

export function ToolStatusManager({
  tools,
  statusMap,
  action,
}: {
  tools: Tool[];
  statusMap: ToolStatusMap;
  action: (slug: string, formData: FormData) => void | Promise<void>;
}) {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? tools.filter((tool) => tool.name.toLowerCase().includes(search.trim().toLowerCase()))
    : tools;

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search tools..."
        className="input input-bordered input-sm w-full sm:max-w-xs"
      />

      <div className="mt-3 max-h-[28rem] overflow-y-auto rounded-lg border border-base-300 bg-base-100 px-4">
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-sm text-base-content/50">No tools match.</p>
        ) : (
          filtered.map((tool) => (
            <ToolStatusRow
              key={tool.slug}
              tool={tool}
              status={statusMap[tool.slug]}
              action={action.bind(null, tool.slug)}
            />
          ))
        )}
      </div>
    </div>
  );
}
