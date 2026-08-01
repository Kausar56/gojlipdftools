"use client";

import { useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { describeError } from "@/lib/errorHelpers";

type Status = "idle" | "working" | "done" | "error";

export function RepairWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  function resetOutput() {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setPageCount(null);
    setStatus("idle");
    setErrorMessage("");
  }

  function loadFile(selected: File) {
    resetOutput();
    setFile(selected);
  }

  async function handleRepair() {
    if (!file) return;
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setStatus("working");
    setErrorMessage("");

    try {
      const { PDFDocument, ParseSpeeds } = await import("pdf-lib");
      const bytes = await file.arrayBuffer();

      // The actual "repair" is just parsing as leniently as pdf-lib allows
      // (a slower, more careful scan instead of trusting a possibly-broken
      // xref table, plus tolerating invalid objects and encryption issues)
      // and then re-saving — that rewrites a fresh, well-formed file from
      // whatever pdf-lib managed to recover, fixing the structural issues
      // that made the original hard for some readers to open.
      const doc = await PDFDocument.load(bytes, {
        ignoreEncryption: true,
        throwOnInvalidObject: false,
        updateMetadata: false,
        parseSpeed: ParseSpeeds.Slow,
      });

      const recoveredPages = doc.getPageCount();
      if (recoveredPages === 0) {
        setStatus("error");
        setErrorMessage("This file is too damaged to recover — no readable pages were found.");
        return;
      }

      const outBytes = await doc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setPageCount(recoveredPages);
      setStatus("done");
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, error instanceof Error ? `Couldn't repair this PDF: ${error.message}` : "Couldn't repair this PDF — it may be too damaged to recover.",));
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

      <p className="mt-5 text-sm text-base-content/70">
        Re-parses the file as carefully and leniently as possible, then rebuilds it as a fresh, well-formed
        PDF. This fixes many common structural issues (a broken cross-reference table, minor invalid
        objects) — but a severely truncated or overwritten file may not be recoverable.
      </p>

      {status === "done" && pageCount !== null && (
        <p className="mt-4 rounded-lg border border-base-300 bg-base-200 px-3 py-2 text-sm text-base-content/70">
          Recovered {pageCount} page{pageCount === 1 ? "" : "s"}.
        </p>
      )}

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      <div className="mt-6">
        {status === "done" && downloadUrl ? (
          <a href={downloadUrl} download="repaired.pdf" className="btn btn-primary w-full">
            <ToolIcon name="download" className="h-4 w-4" />
            Download Repaired PDF
          </a>
        ) : (
          <button
            type="button"
            onClick={handleRepair}
            disabled={status === "working"}
            className="btn btn-primary w-full"
          >
            {status === "working" ? "Repairing..." : "Repair PDF"}
          </button>
        )}
      </div>
    </div>
  );
}
