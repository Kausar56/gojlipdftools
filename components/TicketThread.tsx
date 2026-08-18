"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import type { TicketMessage } from "@/lib/tickets";
import { describeError } from "@/lib/errorHelpers";

// A user's own thread only ever needs "You" vs "Support Team" — the sender's
// actual identity isn't resolved for that view (see lib/tickets.ts's
// getTicketForUser) so a specific staff email is never shown to a user.
// Staff viewing any ticket see the real identity on both sides instead,
// since it's useful to know which teammate replied.
function senderLabel(message: TicketMessage, viewerRole: "user" | "staff") {
  if (viewerRole === "user") return message.senderRole === "user" ? "You" : "Support Team";
  if (message.senderRole === "staff") return message.senderEmail ?? "Staff";
  return message.senderEmail ?? "User";
}

export function TicketThread({
  messages,
  viewerRole,
  replyAction,
}: {
  messages: TicketMessage[];
  viewerRole: "user" | "staff";
  replyAction: (formData: FormData) => void | Promise<void>;
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
        await replyAction(formData);
        setBody("");
        toast.success("Reply sent.");
      } catch (error) {
        toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't send your reply."));
      }
    });
  }

  return (
    <div>
      <div className="space-y-3">
        {messages.map((message) => {
          const isMine = message.senderRole === viewerRole;
          return (
            <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-md rounded-lg px-4 py-2 text-sm ${
                  isMine ? "bg-primary text-primary-content" : "bg-base-200 text-base-content"
                }`}
              >
                <p className={`text-xs ${isMine ? "text-primary-content/70" : "text-base-content/50"}`}>
                  {senderLabel(message, viewerRole)} · {new Date(message.createdAt).toLocaleString()}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{message.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2">
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Type your reply..."
          rows={3}
          className="textarea textarea-bordered w-full"
        />
        <button type="submit" disabled={isPending || !body.trim()} className="btn btn-primary btn-sm self-end">
          {isPending ? "Sending..." : "Send Reply"}
        </button>
      </form>
    </div>
  );
}
