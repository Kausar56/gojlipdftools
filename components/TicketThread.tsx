"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { TICKET_ATTACHMENT_ACCEPT, TICKET_ATTACHMENT_MAX_BYTES, type TicketMessage, type TicketStatus } from "@/lib/tickets";
import { describeError } from "@/lib/errorHelpers";
import { uploadFileViaSignedEndpoint } from "@/lib/uploadImageClient";
import { ToolIcon } from "./icons";

type DisplayMessage = Omit<TicketMessage, "attachmentPublicId" | "attachmentResourceType"> & { attachmentUrl: string | null };

// A user's own thread only ever needs "You" vs "Gojli Support" — the
// sender's actual identity isn't resolved for that view (see lib/tickets.ts's
// getTicketForUser) so a specific staff member's personal email is never
// shown to a user. Staff viewing any ticket see the real identity on both
// sides instead, since it's useful to know which teammate replied.
function senderLabel(message: DisplayMessage, viewerRole: "user" | "staff") {
  if (viewerRole === "user") return message.senderRole === "user" ? "You" : "Gojli Support";
  if (message.senderRole === "staff") return message.senderEmail ?? "Staff";
  return message.senderEmail ?? "User";
}

function AttachmentLink({ url, name }: { url: string; name: string | null }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1.5 flex items-center gap-1.5 rounded border border-current/20 px-2 py-1 text-xs underline-offset-2 hover:underline"
    >
      <ToolIcon name="paperclip" className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{name || "Attachment"}</span>
    </a>
  );
}

export function TicketThread({
  messages,
  viewerRole,
  status,
  locked = false,
  replyAction,
  reopenAction,
}: {
  messages: DisplayMessage[];
  viewerRole: "user" | "staff";
  /** When "closed", the reply form is replaced with a notice (+ a Reopen
   *  button, for the user side — see reopenAction) instead of accepting new
   *  messages. Staff reopen a ticket via the status dropdown elsewhere on
   *  the page instead, so reopenAction is only ever passed for viewerRole
   *  "user". */
  status: TicketStatus;
  /** Admin-only escalation on top of "closed" (see lib/tickets.ts's Ticket
   *  type and app/admin/tickets/actions.ts's lockTicket) — once true, the
   *  Reopen button is replaced with a pointer to open a new ticket instead,
   *  since reopenAction would just reject it anyway. Only meaningful for
   *  viewerRole "user"; staff always keep full status control. */
  locked?: boolean;
  replyAction: (formData: FormData) => void | Promise<void>;
  reopenAction?: () => void | Promise<void>;
}) {
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const [isPending, startTransition] = useTransition();
  const [isReopening, startReopenTransition] = useTransition();
  const isClosed = status === "closed";

  // Chat-style: always land on the latest message, both on first load and
  // after a new one arrives (reply, or a background revalidation).
  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) return;
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("body", body);
        if (attachment) {
          setUploading(true);
          const { publicId, resourceType } = await uploadFileViaSignedEndpoint(attachment, "/api/tickets/upload-signature");
          setUploading(false);
          formData.set("attachmentPublicId", publicId);
          formData.set("attachmentResourceType", resourceType);
          formData.set("attachmentName", attachment.name);
        }
        await replyAction(formData);
        setBody("");
        setAttachment(null);
        toast.success("Reply sent.");
      } catch (error) {
        setUploading(false);
        toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't send your reply."));
      }
    });
  }

  function handleAttachmentPick(file: File | null) {
    if (file && file.size > TICKET_ATTACHMENT_MAX_BYTES) {
      toast.error(`That file is too large — max ${Math.round(TICKET_ATTACHMENT_MAX_BYTES / (1024 * 1024))}MB.`);
      return;
    }
    setAttachment(file);
  }

  function handleReopen() {
    if (!reopenAction) return;
    startReopenTransition(async () => {
      try {
        await reopenAction();
        toast.success("Ticket reopened.");
      } catch (error) {
        toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't reopen this ticket."));
      }
    });
  }

  return (
    <div className="flex h-136 flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-base-content/40">No messages yet.</p>
        ) : (
          messages.map((message) => {
            const isMine = message.senderRole === viewerRole;
            return (
              <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-md rounded-2xl px-4 py-2 text-sm ${
                    isMine ? "rounded-br-sm bg-primary text-primary-content" : "rounded-bl-sm bg-base-200 text-base-content"
                  }`}
                >
                  <p className={`text-xs ${isMine ? "text-primary-content/70" : "text-base-content/50"}`}>
                    {senderLabel(message, viewerRole)} · {new Date(message.createdAt).toLocaleString()}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{message.body}</p>
                  {message.attachmentUrl && <AttachmentLink url={message.attachmentUrl} name={message.attachmentName} />}
                  {/* Only ever shown on your own messages, once the other
                      side has viewed the ticket — see lib/tickets.ts's
                      markMessagesRead, triggered just by opening the thread. */}
                  {isMine && message.readAt && (
                    <p className="mt-0.5 flex items-center justify-end gap-0.5 text-[11px] text-primary-content/70">
                      <ToolIcon name="check" className="h-3 w-3" />
                      Seen
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={scrollAnchorRef} />
      </div>

      {/* Pinned to the bottom of the chat panel (not the page) via flex
          layout + shrink-0 — the message list above is what scrolls. */}
      {isClosed ? (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-base-300 bg-base-200/50 px-4 py-3 text-sm text-base-content/60">
          {locked ? (
            <>
              <span>This ticket has been permanently closed by our support team.</span>
              <Link href="/dashboard/tickets" className="btn btn-outline btn-xs shrink-0">
                Open a New Ticket
              </Link>
            </>
          ) : (
            <>
              <span>This ticket is closed — replies are disabled.</span>
              {reopenAction && (
                <button type="button" onClick={handleReopen} disabled={isReopening} className="btn btn-outline btn-xs">
                  {isReopening ? "Reopening..." : "Reopen Ticket"}
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="shrink-0 border-t border-base-300 bg-base-100 p-3">
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Type your reply..."
            rows={2}
            className="textarea textarea-bordered w-full resize-none"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={TICKET_ATTACHMENT_ACCEPT}
                className="hidden"
                onChange={(event) => handleAttachmentPick(event.target.files?.[0] ?? null)}
              />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-ghost btn-xs">
                <ToolIcon name="paperclip" className="h-3.5 w-3.5" />
                Attach
              </button>
              {attachment && (
                <span className="flex min-w-0 items-center gap-1 text-xs text-base-content/60">
                  <span className="truncate">{attachment.name}</span>
                  <button type="button" onClick={() => setAttachment(null)} className="shrink-0 text-error hover:underline">
                    Remove
                  </button>
                </span>
              )}
            </div>
            <button type="submit" disabled={isPending || !body.trim()} className="btn btn-primary btn-sm shrink-0">
              {uploading ? "Uploading..." : isPending ? "Sending..." : "Send Reply"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
