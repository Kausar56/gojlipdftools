"use client";

import { useState } from "react";
import Link from "next/link";
import type { Tool } from "@/lib/tools";

export function ToolContentList({ tools, customizedSlugs }: { tools: Tool[]; customizedSlugs: string[] }) {
  const [search, setSearch] = useState("");
  const customized = new Set(customizedSlugs);

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
      <p className="mt-2 text-xs text-base-content/50">
        {filtered.length} of {tools.length} tools
      </p>

      {/* No inner max-height/scroll — with 40+ tools a short scroll box hid
          most of the list below the fold, so tools past the first dozen
          looked like they were missing. */}
      <div className="mt-2 rounded-lg border border-base-300 bg-base-100">
        {filtered.length === 0 ? (
          <p className="p-4 text-center text-sm text-base-content/50">No tools match.</p>
        ) : (
          <ul className="divide-y divide-base-200">
            {filtered.map((tool) => (
              <li key={tool.slug}>
                <Link
                  href={`/admin/tool-content/${tool.slug}`}
                  className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-base-200"
                >
                  <span className="text-base-content/80">{tool.name}</span>
                  {customized.has(tool.slug) && <span className="badge badge-primary badge-sm">Customized</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
