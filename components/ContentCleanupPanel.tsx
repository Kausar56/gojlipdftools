"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { describeError } from "@/lib/errorHelpers";

/** One-time (repeatable, harmless to re-run) cleanup for content saved
 *  before sanitizeRichTextHtml started stripping non-breaking spaces — see
 *  lib/sanitizeRichText.ts. Re-runs the sanitizer over every blog post and
 *  tool-content override already in the database, same fix opening one and
 *  clicking Save would apply, just for everything at once. */
export function ContentCleanupPanel({
  cleanupBlogAction,
  cleanupToolContentAction,
}: {
  cleanupBlogAction: () => Promise<{ fixed: number; checked: number }>;
  cleanupToolContentAction: () => Promise<{ fixed: number; checked: number }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [lastResult, setLastResult] = useState<string | null>(null);

  function handleClick() {
    startTransition(async () => {
      try {
        const [blogResult, toolResult] = await Promise.all([cleanupBlogAction(), cleanupToolContentAction()]);
        const totalFixed = blogResult.fixed + toolResult.fixed;
        const summary =
          totalFixed === 0
            ? `Checked ${blogResult.checked} blog posts and ${toolResult.checked} tool guides — nothing needed fixing.`
            : `Fixed ${blogResult.fixed} blog post(s) and ${toolResult.fixed} tool guide(s) (checked ${blogResult.checked + toolResult.checked} total).`;
        setLastResult(summary);
        toast.success(totalFixed > 0 ? "Content cleaned up." : "Nothing needed fixing.");
      } catch (error) {
        toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't clean up content."));
      }
    });
  }

  return (
    <div className="max-w-lg space-y-3 rounded-lg border border-base-300 bg-base-100 p-4">
      <p className="text-sm text-base-content/70">
        Fixes text pasted from Word, Google Docs, or an AI tool that silently overflows its column instead of
        wrapping — caused by non-breaking spaces those tools insert in place of regular ones. Safe to run anytime;
        it only touches posts/guides that actually still have the problem.
      </p>
      <button type="button" onClick={handleClick} disabled={isPending} className="btn btn-outline btn-sm">
        {isPending ? "Checking..." : "Fix Non-Breaking Spaces in Content"}
      </button>
      {lastResult && <p className="text-xs text-base-content/50">{lastResult}</p>}
    </div>
  );
}
