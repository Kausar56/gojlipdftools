"use client";

import type { DetectedTextItem } from "@/lib/editorElements";
import { ToolIcon } from "./icons";

export type SearchMatch = { pageIndex: number; item: DetectedTextItem };

export function FindReplacePanel({
  findQuery,
  replaceQuery,
  matchCase,
  matches,
  isIndexing,
  onFindQueryChange,
  onReplaceQueryChange,
  onMatchCaseChange,
  onReplace,
  onReplaceAll,
  onJumpToPage,
  onClose,
}: {
  findQuery: string;
  replaceQuery: string;
  matchCase: boolean;
  matches: SearchMatch[];
  isIndexing: boolean;
  onFindQueryChange: (value: string) => void;
  onReplaceQueryChange: (value: string) => void;
  onMatchCaseChange: (value: boolean) => void;
  onReplace: (match: SearchMatch) => void;
  onReplaceAll: () => void;
  onJumpToPage: (pageIndex: number) => void;
  onClose: () => void;
}) {
  return (
    // Fixed (not absolute) — this page scrolls the normal document way rather
    // than in its own internal scroll container, so a fixed position is what
    // keeps the panel on screen and clear of the pinned toolbar as the user
    // scrolls, instead of anchoring to some arbitrary ancestor.
    <div className="fixed top-20 right-4 left-4 z-50 w-auto max-w-80 rounded-xl border border-base-300 bg-base-100 shadow-xl sm:left-auto sm:w-80">
      <div className="flex items-center justify-between border-b border-base-300 px-3 py-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-base-content">
          <ToolIcon name="search" className="h-4 w-4" />
          Find & Replace
        </span>
        <button type="button" onClick={onClose} className="btn btn-ghost btn-xs btn-square" aria-label="Close">
          <ToolIcon name="close" className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-2 p-3">
        <input
          type="text"
          value={findQuery}
          onChange={(event) => onFindQueryChange(event.target.value)}
          placeholder="Find..."
          autoFocus
          className="input input-bordered input-sm w-full"
        />
        <input
          type="text"
          value={replaceQuery}
          onChange={(event) => onReplaceQueryChange(event.target.value)}
          placeholder="Replace with..."
          className="input input-bordered input-sm w-full"
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs text-base-content/70">
            <input
              type="checkbox"
              checked={matchCase}
              onChange={(event) => onMatchCaseChange(event.target.checked)}
              className="checkbox checkbox-xs"
            />
            Match case
          </label>
          <button
            type="button"
            onClick={onReplaceAll}
            disabled={matches.length === 0}
            className="btn btn-primary btn-xs"
          >
            Replace all ({matches.length})
          </button>
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto border-t border-base-300">
        {isIndexing ? (
          <p className="p-3 text-center text-xs text-base-content/60">Scanning document...</p>
        ) : !findQuery.trim() ? (
          <p className="p-3 text-center text-xs text-base-content/60">Type something to search the whole document.</p>
        ) : matches.length === 0 ? (
          <p className="p-3 text-center text-xs text-base-content/60">No matches found.</p>
        ) : (
          <ul className="divide-y divide-base-200">
            {matches.map((match) => (
              <li key={`${match.pageIndex}-${match.item.itemIndex}`} className="flex items-center gap-2 px-3 py-2">
                <button
                  type="button"
                  onClick={() => onJumpToPage(match.pageIndex)}
                  className="min-w-0 flex-1 truncate text-left text-xs text-base-content/80 hover:text-primary"
                  title={match.item.str}
                >
                  <span className="mr-1.5 text-base-content/50">p.{match.pageIndex + 1}</span>
                  {match.item.str}
                </button>
                <button type="button" onClick={() => onReplace(match)} className="btn btn-ghost btn-xs shrink-0">
                  Replace
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
