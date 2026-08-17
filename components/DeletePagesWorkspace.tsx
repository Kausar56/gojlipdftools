"use client";

import { useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { SaveSuccessModal } from "./SaveSuccessModal";
import { parsePageList } from "@/lib/pageRanges";
import { describeError } from "@/lib/errorHelpers";

type Status = "idle" | "working" | "done" | "error";

export function DeletePagesWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [pagesInput, setPagesInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  function resetOutput() {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setStatus("idle");
    setErrorMessage("");
    setShowSuccessModal(false);
  }

  async function loadFile(selected: File) {
    resetOutput();
    setFile(selected);
    setTotalPages(null);
    setPagesInput("");
    try {
      const { PDFDocument } = await import("pdf-lib");
      const bytes = await selected.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      setTotalPages(doc.getPageCount());
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        describeError(error, "Couldn't read this file — make sure it's a valid PDF."),
      );
    }
  }

  async function handleDelete() {
    if (!file || !totalPages) return;
    const parsed = parsePageList(pagesInput, totalPages);
    if ("error" in parsed) {
      setStatus("error");
      setErrorMessage(parsed.error);
      return;
    }
    const toDelete = new Set(parsed);
    if (toDelete.size >= totalPages) {
      setStatus("error");
      setErrorMessage("You can't delete every page — at least one page must remain.");
      return;
    }

    setStatus("working");
    setErrorMessage("");

    try {
      const { PDFDocument } = await import("pdf-lib");
      const bytes = await file.arrayBuffer();
      const sourcePdf = await PDFDocument.load(bytes);
      const keepIndices = Array.from({ length: totalPages }, (_, index) => index).filter(
        (index) => !toDelete.has(index),
      );

      const newDoc = await PDFDocument.create();
      const copiedPages = await newDoc.copyPages(sourcePdf, keepIndices);
      copiedPages.forEach((page) => newDoc.addPage(page));

      const outBytes = await newDoc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("done");
      setShowSuccessModal(true);
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, error instanceof Error ? `Couldn't delete pages: ${error.message}` : "Couldn't delete pages from this PDF.",));
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
      {showSuccessModal && downloadUrl && (
        <SaveSuccessModal
          downloadUrl={downloadUrl}
          downloadFileName="pages-deleted.pdf"
          onClose={() => setShowSuccessModal(false)}
        />
      )}

      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 truncate">
          <ToolIcon name="split" className="h-4 w-4 text-secondary" />
          <span className="truncate text-base-content/80">{file.name}</span>
          {totalPages && <span className="badge badge-neutral badge-sm">{totalPages} pages</span>}
        </span>
        <button
          type="button"
          onClick={() => {
            setFile(null);
            setTotalPages(null);
            resetOutput();
          }}
          className="text-xs text-base-content/50 hover:text-error"
        >
          Replace
        </button>
      </div>

      {totalPages && (
        <div className="mt-5">
          <label className="text-sm font-medium text-base-content">
            Pages to delete
            <input
              type="text"
              value={pagesInput}
              onChange={(event) => {
                setPagesInput(event.target.value);
                resetOutput();
              }}
              placeholder={`e.g. 1, 3-5, ${totalPages}`}
              className="input input-bordered mt-1.5 w-full"
            />
          </label>
          <p className="mt-1.5 text-xs text-base-content/50">
            This file has {totalPages} page{totalPages === 1 ? "" : "s"}. Everything else is kept.
          </p>
        </div>
      )}

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      <div className="mt-5">
        {status === "done" && downloadUrl ? (
          <a href={downloadUrl} download="pages-deleted.pdf" className="btn btn-primary w-full">
            <ToolIcon name="download" className="h-4 w-4" />
            Download PDF
          </a>
        ) : (
          <button
            type="button"
            onClick={handleDelete}
            disabled={!totalPages || !pagesInput.trim() || status === "working"}
            className="btn btn-primary w-full"
          >
            {status === "working" ? "Deleting..." : "Delete Pages"}
          </button>
        )}
      </div>
    </div>
  );
}
