"use client";

import { useMemo, useState } from "react";
import { ToolIcon } from "./icons";
import { ToolCard } from "./ToolCard";
import { Reveal } from "./Reveal";
import type { Tool } from "@/lib/tools";

export function ToolGrid({ tools }: { tools: Tool[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tools;
    return tools.filter(
      (tool) =>
        tool.name.toLowerCase().includes(q) || tool.shortDescription.toLowerCase().includes(q),
    );
  }, [tools, query]);

  return (
    <div>
      <label className="input input-bordered mx-auto flex w-full max-w-md items-center gap-2">
        <ToolIcon name="search" className="h-4 w-4 text-base-content/50" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search a tool, e.g. merge, compress..."
          className="grow"
        />
      </label>

      {filtered.length > 0 ? (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((tool, index) => (
            <Reveal key={tool.slug} delayMs={Math.min(index, 7) * 60}>
              <ToolCard tool={tool} />
            </Reveal>
          ))}
        </div>
      ) : (
        <p className="mt-10 text-center text-sm text-base-content/60">
          No tools match &ldquo;{query}&rdquo; yet.
        </p>
      )}
    </div>
  );
}
