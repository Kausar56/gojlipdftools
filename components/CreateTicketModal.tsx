"use client";

import { useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { ToolIcon } from "./icons";
import { describeError, isRedirectError } from "@/lib/errorHelpers";
import { uploadFileViaSignedEndpoint } from "@/lib/uploadImageClient";
import { TICKET_CATEGORIES, TICKET_CATEGORY_LABELS, TICKET_ATTACHMENT_ACCEPT, TICKET_ATTACHMENT_MAX_BYTES } from "@/lib/tickets";

export function CreateTicketModal({
  createAction,
  onClose,
}: {
  createAction: (formData: FormData) => Promise<void>;
  onClose: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleAttachmentPick(file: File | null) {
    if (file && file.size > TICKET_ATTACHMENT_MAX_BYTES) {
      toast.error(`That file is too large — max ${Math.round(TICKET_ATTACHMENT_MAX_BYTES / (1024 * 1024))}MB.`);
      return;
    }
    setAttachment(file);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        if (attachment) {
          setUploading(true);
          const { publicId, resourceType } = await uploadFileViaSignedEndpoint(attachment, "/api/tickets/upload-signature");
          setUploading(false);
          formData.set("attachmentPublicId", publicId);
          formData.set("attachmentResourceType", resourceType);
          formData.set("attachmentName", attachment.name);
        }
        // createTicket redirects to the new ticket's page on success, which
        // throws internally — there's nothing to do here in that case, the
        // modal (and this whole page) is about to unmount anyway.
        await createAction(formData);
      } catch (error) {
        setUploading(false);
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
            Category
            <select name="category" defaultValue="" className="select select-bordered select-sm mt-1 w-full">
              <option value="">No category</option>
              {TICKET_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {TICKET_CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
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

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={TICKET_ATTACHMENT_ACCEPT}
              className="hidden"
              onChange={(event) => handleAttachmentPick(event.target.files?.[0] ?? null)}
            />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-ghost btn-xs">
              <ToolIcon name="paperclip" className="h-3.5 w-3.5" />
              Attach a file
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
          <p className="text-xs text-base-content/40">PDF, JPG, or PNG — up to {Math.round(TICKET_ATTACHMENT_MAX_BYTES / (1024 * 1024))}MB.</p>

          <button
            type="submit"
            disabled={isPending || !subject.trim() || !message.trim()}
            className="btn btn-primary btn-sm w-full"
          >
            {uploading ? "Uploading..." : isPending ? "Creating..." : "Create Ticket"}
          </button>
        </form>
      </div>
    </div>
  );
}
