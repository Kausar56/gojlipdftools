"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import type { TicketNote } from "@/lib/tickets";
import { describeError } from "@/lib/errorHelpers";
import { ToolIcon } from "./icons";

/** Staff-only — never rendered on the user-facing ticket page. See
 *  docs/tickets-schema.sql's ticket_notes comment for why notes live in
 *  their own table instead of a flag on ticket_messages. A button + modal
 *  (rather than an always-visible card) keeps the main ticket view focused
 *  on the conversation, since notes are a secondary, occasional action. */
export function TicketNotesButton({
  notes,
  addNoteAction,
}: {
  notes: TicketNote[];
  addNoteAction: (formData: FormData) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-outline btn-sm">
        🔒 Notes{notes.length > 0 && ` (${notes.length})`}
      </button>
      {open && <NotesModal notes={notes} addNoteAction={addNoteAction} onClose={() => setOpen(false)} />}
    </>
  );
}

function NotesModal({
  notes,
  addNoteAction,
  onClose,
}: {
  notes: TicketNote[];
  addNoteAction: (formData: FormData) => void | Promise<void>;
  onClose: () => void;
}) {
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) return;
    const formData = new FormData();
    formData.set("body", body);
    startTransition(async () => {
      try {
        await addNoteAction(formData);
        setBody("");
        toast.success("Note added.");
      } catch (error) {
        toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't add the note."));
      }
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-warning/30 bg-base-100 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-base-content">🔒 Internal Notes</p>
            <p className="text-xs text-base-content/50">Only visible to staff — the ticket owner never sees these.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="btn btn-ghost btn-xs btn-square">
            <ToolIcon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          {notes.length === 0 ? (
            <p className="rounded-lg border border-dashed border-base-300 px-4 py-8 text-center text-xs text-base-content/40">
              No internal notes yet.
            </p>
          ) : (
            <div className="space-y-2">
              {notes.map((note) => (
                <div key={note.id} className="rounded-md bg-warning/5 px-3 py-2 text-sm">
                  <p className="text-xs text-base-content/50">
                    {note.authorEmail ?? "Staff"} · {new Date(note.createdAt).toLocaleString()}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap text-base-content">{note.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex shrink-0 flex-col gap-2">
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Add an internal note..."
            rows={3}
            className="textarea textarea-bordered w-full"
          />
          <button type="submit" disabled={isPending || !body.trim()} className="btn btn-primary btn-sm self-end">
            {isPending ? "Adding..." : "Add Note"}
          </button>
        </form>
      </div>
    </div>
  );
}
