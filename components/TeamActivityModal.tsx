"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import type { AuditEntry } from "@/lib/auditLog";
import { describeError } from "@/lib/errorHelpers";
import { UserActivityHistory } from "./UserActivityHistory";
import { ToolIcon } from "./icons";

export function TeamActivityModal({
  memberId,
  memberEmail,
  fetchActivity,
}: {
  memberId: string;
  memberEmail: string;
  fetchActivity: (userId: string) => Promise<AuditEntry[]>;
}) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpen() {
    setOpen(true);
    // Fetched on demand rather than upfront for every row — most team
    // members' history never gets looked at (see the Server Action's own
    // comment in app/admin/moderators/actions.ts).
    startTransition(async () => {
      try {
        setEntries(await fetchActivity(memberId));
      } catch (error) {
        toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't load activity."));
        setOpen(false);
      }
    });
  }

  return (
    <>
      <button type="button" onClick={handleOpen} className="text-sm text-primary hover:underline">
        View activity
      </button>
      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border border-base-300 bg-base-100 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-base-content">Activity</p>
                <p className="text-xs text-base-content/50">{memberEmail}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="btn btn-ghost btn-xs btn-square">
                <ToolIcon name="close" className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
              {isPending || entries === null ? (
                <p className="text-sm text-base-content/50">Loading...</p>
              ) : (
                <UserActivityHistory entries={entries} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
