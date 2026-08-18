"use client";

import { useTransition } from "react";
import toast from "react-hot-toast";
import { describeError, isRedirectError } from "@/lib/errorHelpers";

export function DeletePostButton({
  action,
  className = "btn btn-outline btn-error btn-sm",
}: {
  action: () => Promise<void>;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm("Delete this post? This can't be undone.")) return;
    startTransition(async () => {
      try {
        await action();
      } catch (error) {
        if (isRedirectError(error)) throw error;
        toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't delete this post."));
      }
    });
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className={className}>
      {isPending ? "Deleting..." : "Delete"}
    </button>
  );
}
