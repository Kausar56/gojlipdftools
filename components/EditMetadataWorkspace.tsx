"use client";

import { useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { describeError } from "@/lib/errorHelpers";

type Status = "idle" | "working" | "done" | "error";
type Mode = "edit" | "remove";

type MetadataFields = {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
};

const emptyFields: MetadataFields = { title: "", author: "", subject: "", keywords: "", creator: "", producer: "" };

export function EditMetadataWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<Mode>("edit");
  const [fields, setFields] = useState<MetadataFields>(emptyFields);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  function resetOutput() {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setStatus("idle");
    setErrorMessage("");
  }

  async function loadFile(selected: File) {
    resetOutput();
    setFile(selected);
    setMode("edit");
    setFields(emptyFields);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const bytes = await selected.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      setFields({
        title: doc.getTitle() ?? "",
        author: doc.getAuthor() ?? "",
        subject: doc.getSubject() ?? "",
        keywords: doc.getKeywords() ?? "",
        creator: doc.getCreator() ?? "",
        producer: doc.getProducer() ?? "",
      });
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        describeError(error, "Couldn't read this file — make sure it's a valid PDF."),
      );
    }
  }

  async function handleSave() {
    if (!file) return;
    setStatus("working");
    setErrorMessage("");

    try {
      const { PDFDocument } = await import("pdf-lib");
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);

      // Remove mode clears every identifying field regardless of what was
      // typed into the edit form — Edit mode saves exactly what's in it.
      const target = mode === "remove" ? emptyFields : fields;

      doc.setTitle(target.title);
      doc.setAuthor(target.author);
      doc.setSubject(target.subject);
      doc.setKeywords(
        target.keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
      );
      doc.setCreator(target.creator);
      doc.setProducer(target.producer);

      const outBytes = await doc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("done");
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, error instanceof Error ? `Couldn't update metadata: ${error.message}` : "Couldn't update this PDF's metadata.",));
    }
  }

  if (!file) {
    return (
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const dropped = event.dataTransfer.files?.[0];
          if (dropped) loadFile(dropped);
        }}
        className="card flex min-h-48 flex-col items-center justify-center gap-3 py-8 text-center"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ToolIcon name="upload" className="h-6 w-6" />
        </span>
        <p className="text-sm text-base-content/70">Drag & drop a PDF here, or</p>
        <div className="flex">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="btn btn-primary btn-md rounded-r-none"
          >
            Choose File
          </button>
          <UploadSourceMenu onFile={loadFile} />
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(event) => {
            const selected = event.target.files?.[0];
            if (selected) loadFile(selected);
          }}
        />
      </div>
    );
  }

  return (
    <div className="card border border-base-300 bg-base-100 p-6 shadow-sm">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 truncate">
          <ToolIcon name="file" className="h-4 w-4 text-primary" />
          <span className="truncate text-base-content/80">{file.name}</span>
        </span>
        <button
          type="button"
          onClick={() => {
            setFile(null);
            resetOutput();
          }}
          className="text-xs text-base-content/50 hover:text-error"
        >
          Replace
        </button>
      </div>

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setMode("edit");
            resetOutput();
          }}
          className={`flex-1 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
            mode === "edit"
              ? "border-primary bg-primary/5 text-base-content"
              : "border-base-300 text-base-content/70 hover:border-primary/40"
          }`}
        >
          <span className="block font-medium">Edit Metadata</span>
          <span className="block text-xs text-base-content/50">Change the title, author, and other fields</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("remove");
            resetOutput();
          }}
          className={`flex-1 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
            mode === "remove"
              ? "border-primary bg-primary/5 text-base-content"
              : "border-base-300 text-base-content/70 hover:border-primary/40"
          }`}
        >
          <span className="block font-medium">Remove Metadata</span>
          <span className="block text-xs text-base-content/50">Clear all identifying fields in one click</span>
        </button>
      </div>

      {mode === "edit" ? (
        <div className="mt-5 space-y-3">
          <label className="block text-sm font-medium text-base-content">
            Title
            <input
              type="text"
              value={fields.title}
              onChange={(event) => {
                setFields((prev) => ({ ...prev, title: event.target.value }));
                resetOutput();
              }}
              className="input input-bordered mt-1.5 w-full"
            />
          </label>
          <label className="block text-sm font-medium text-base-content">
            Author
            <input
              type="text"
              value={fields.author}
              onChange={(event) => {
                setFields((prev) => ({ ...prev, author: event.target.value }));
                resetOutput();
              }}
              className="input input-bordered mt-1.5 w-full"
            />
          </label>
          <label className="block text-sm font-medium text-base-content">
            Subject
            <input
              type="text"
              value={fields.subject}
              onChange={(event) => {
                setFields((prev) => ({ ...prev, subject: event.target.value }));
                resetOutput();
              }}
              className="input input-bordered mt-1.5 w-full"
            />
          </label>
          <label className="block text-sm font-medium text-base-content">
            Keywords
            <input
              type="text"
              value={fields.keywords}
              onChange={(event) => {
                setFields((prev) => ({ ...prev, keywords: event.target.value }));
                resetOutput();
              }}
              placeholder="comma, separated, keywords"
              className="input input-bordered mt-1.5 w-full"
            />
          </label>
          <label className="block text-sm font-medium text-base-content">
            Creator
            <input
              type="text"
              value={fields.creator}
              onChange={(event) => {
                setFields((prev) => ({ ...prev, creator: event.target.value }));
                resetOutput();
              }}
              className="input input-bordered mt-1.5 w-full"
            />
          </label>
          <label className="block text-sm font-medium text-base-content">
            Producer
            <input
              type="text"
              value={fields.producer}
              onChange={(event) => {
                setFields((prev) => ({ ...prev, producer: event.target.value }));
                resetOutput();
              }}
              className="input input-bordered mt-1.5 w-full"
            />
          </label>
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-base-300 bg-base-200 p-4 text-sm">
          <p className="text-base-content/70">This will clear the following from the PDF:</p>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {[
              { label: "Title", value: fields.title },
              { label: "Author", value: fields.author },
              { label: "Subject", value: fields.subject },
              { label: "Keywords", value: fields.keywords },
              { label: "Creator", value: fields.creator },
              { label: "Producer", value: fields.producer },
            ].map((item) => (
              <li key={item.label} className="flex justify-between gap-2 text-base-content/70">
                <span className="font-medium text-base-content">{item.label}</span>
                <span className="truncate text-base-content/50">{item.value || "(empty)"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      <div className="mt-5">
        {status === "done" && downloadUrl ? (
          <a
            href={downloadUrl}
            download={mode === "remove" ? "metadata-removed.pdf" : "metadata-updated.pdf"}
            className="btn btn-primary w-full"
          >
            <ToolIcon name="download" className="h-4 w-4" />
            Download PDF
          </a>
        ) : (
          <button type="button" onClick={handleSave} disabled={status === "working"} className="btn btn-primary w-full">
            {status === "working" ? "Saving..." : mode === "remove" ? "Remove Metadata" : "Save Metadata"}
          </button>
        )}
      </div>
    </div>
  );
}
