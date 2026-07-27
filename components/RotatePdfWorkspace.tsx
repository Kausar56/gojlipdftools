"use client";

import { useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { parsePageList } from "@/lib/pageRanges";

type Status = "idle" | "rotating" | "done" | "error";

export function RotatePdfWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [applyToAll, setApplyToAll] = useState(true);
  const [pagesInput, setPagesInput] = useState("");
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
    setTotalPages(null);
    setRotation(0);
    setApplyToAll(true);
    setPagesInput("");
    try {
      const { PDFDocument } = await import("pdf-lib");
      const bytes = await selected.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      setTotalPages(doc.getPageCount());
    } catch {
      setStatus("error");
      setErrorMessage("Couldn't read this file — make sure it's a valid PDF.");
    }
  }

  function turn(direction: -1 | 1) {
    setRotation((prev) => (prev + direction * 90 + 360) % 360);
    resetOutput();
  }

  async function handleRotate() {
    if (!file || !totalPages) return;

    let targetPages: number[];
    if (applyToAll) {
      targetPages = Array.from({ length: totalPages }, (_, index) => index);
    } else {
      const parsed = parsePageList(pagesInput, totalPages);
      if ("error" in parsed) {
        setStatus("error");
        setErrorMessage(parsed.error);
        return;
      }
      targetPages = parsed;
    }

    setStatus("rotating");
    setErrorMessage("");

    try {
      const { PDFDocument, degrees } = await import("pdf-lib");
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const targetSet = new Set(targetPages);

      doc.getPages().forEach((page, index) => {
        if (!targetSet.has(index)) return;
        const current = page.getRotation().angle;
        page.setRotation(degrees((current + rotation) % 360));
      });

      const outBytes = await doc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("done");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? `Couldn't rotate this PDF: ${error.message}` : "Couldn't rotate this PDF.",
      );
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
          <ToolIcon name="rotate-pdf" className="h-4 w-4 text-secondary" />
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
        <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-center">
          <div className="flex flex-col items-center gap-2">
            <div
              className="flex h-32 w-24 items-center justify-center rounded-sm border border-base-300 bg-base-200 text-xs text-base-content/50 shadow-sm transition-transform"
              style={{ transform: `rotate(${rotation}deg)` }}
            >
              Page
            </div>
            <span className="text-xs text-base-content/50">{rotation}°</span>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <button type="button" onClick={() => turn(-1)} className="btn btn-outline btn-sm" aria-label="Rotate left">
                <ToolIcon name="undo" className="h-4 w-4" />
                Rotate Left
              </button>
              <button type="button" onClick={() => turn(1)} className="btn btn-outline btn-sm" aria-label="Rotate right">
                <ToolIcon name="redo" className="h-4 w-4" />
                Rotate Right
              </button>
            </div>

            <label className="flex items-center gap-2 text-sm text-base-content/80">
              <input
                type="checkbox"
                checked={applyToAll}
                onChange={(event) => {
                  setApplyToAll(event.target.checked);
                  resetOutput();
                }}
                className="checkbox checkbox-sm"
              />
              Apply to all {totalPages} pages
            </label>

            {!applyToAll && (
              <input
                type="text"
                value={pagesInput}
                onChange={(event) => {
                  setPagesInput(event.target.value);
                  resetOutput();
                }}
                placeholder={`e.g. 1-3, 5, 8-${totalPages}`}
                className="input input-bordered input-sm w-56"
              />
            )}
          </div>
        </div>
      )}

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      <div className="mt-6">
        {status === "done" && downloadUrl ? (
          <a href={downloadUrl} download="rotated.pdf" className="btn btn-primary w-full">
            <ToolIcon name="download" className="h-4 w-4" />
            Download Rotated PDF
          </a>
        ) : (
          <button
            type="button"
            onClick={handleRotate}
            disabled={!totalPages || rotation === 0 || status === "rotating"}
            className="btn btn-primary w-full"
          >
            {status === "rotating" ? "Rotating..." : "Rotate PDF"}
          </button>
        )}
      </div>
      {rotation === 0 && totalPages && (
        <p className="mt-2 text-center text-xs text-base-content/50">
          Rotate left or right to set an angle first.
        </p>
      )}
    </div>
  );
}
