"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import type { Tool } from "@/lib/tools";
import type { ToolStatusMap } from "@/lib/appSettings";
import { describeError } from "@/lib/errorHelpers";

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
  const [isPending, startTransition] = useTransition();

  // Submitting via a plain <form action={fn}> makes React reset the form's
  // DOM state the instant it's submitted (requestFormReset) — for a
  // controlled checkbox that desyncs the visible checkmark from the actual
  // `disabled` state without triggering a re-render to fix it, so it looks
  // like the toggle "un-disabled" itself even though the save succeeded (a
  // reload shows the correct value). Handling submit manually and calling
  // the action ourselves skips that reset entirely.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        await action(formData);
        toast.success(`${tool.name} ${disabled ? "disabled" : "enabled"}.`);
      } catch (error) {
        toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't save this tool's status."));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-b border-base-200 py-3 last:border-0 sm:flex-row sm:items-center">
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
      <button type="submit" disabled={isPending} className="btn btn-outline btn-sm">
        {isPending ? "Saving..." : "Save"}
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
