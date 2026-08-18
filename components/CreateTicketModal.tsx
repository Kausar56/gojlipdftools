"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { ToolIcon } from "./icons";
import { describeError, isRedirectError } from "@/lib/errorHelpers";

export function CreateTicketModal({
  createAction,
  onClose,
}: {
  createAction: (formData: FormData) => Promise<void>;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        // createTicket redirects to the new ticket's page on success, which
        // throws internally — there's nothing to do here in that case, the
        // modal (and this whole page) is about to unmount anyway.
        await createAction(formData);
      } catch (error) {
        if (isRedirectError(error)) throw error;
        toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't create the ticket."));
      }
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-base-300 bg-base-100 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <p className="font-semibold text-base-content">Create a support ticket</p>
          <button type="button" onClick={onClose} aria-label="Close" className="btn btn-ghost btn-xs btn-square">
            <ToolIcon name="close" className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-base-content">
            Subject
            <input
              type="text"
              name="subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              required
              autoFocus
              placeholder="What's this about?"
              className="input input-bordered input-sm mt-1 w-full"
            />
          </label>
          <label className="block text-sm font-medium text-base-content">
            Message
            <textarea
              name="message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              required
              rows={4}
              placeholder="Describe your issue..."
              className="textarea textarea-bordered mt-1 w-full"
            />
          </label>
          <button
            type="submit"
            disabled={isPending || !subject.trim() || !message.trim()}
            className="btn btn-primary btn-sm w-full"
          >
            {isPending ? "Creating..." : "Create Ticket"}
          </button>
        </form>
      </div>
    </div>
  );
}
