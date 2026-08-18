"use client";

import { useRef, useState } from "react";
import type { PDFPage } from "pdf-lib";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { SaveSuccessModal } from "./SaveSuccessModal";
import { describeError } from "@/lib/errorHelpers";

type Status = "idle" | "working" | "done" | "error";
type PageOrder = "regular" | "reverse";

type FileEntry = {
  id: string;
  file: File;
  pageCount: number | null;
  order: PageOrder;
};

export function AlternateMixWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);
  const makeId = () => `file-${nextId.current++}`;

  const [files, setFiles] = useState<FileEntry[]>([]);
  const [switchAfter, setSwitchAfter] = useState(1);
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

  async function addFiles(selected: File[]) {
    if (selected.length === 0) return;
    resetOutput();
    const entries: FileEntry[] = selected.map((file) => ({
      id: makeId(),
      file,
      pageCount: null,
      order: "regular",
    }));
    setFiles((current) => [...current, ...entries]);

    const { PDFDocument } = await import("pdf-lib");
    for (const entry of entries) {
      try {
        const doc = await PDFDocument.load(await entry.file.arrayBuffer());
        const count = doc.getPageCount();
        setFiles((current) => current.map((f) => (f.id === entry.id ? { ...f, pageCount: count } : f)));
      } catch (error) {
        setStatus("error");
        setErrorMessage(describeError(error, `Couldn't read "${entry.file.name}" — make sure it's a valid PDF.`));
      }
    }
  }

  function removeFile(id: string) {
    setFiles((current) => current.filter((f) => f.id !== id));
    resetOutput();
  }

  function moveFile(id: string, direction: -1 | 1) {
    setFiles((current) => {
      const index = current.findIndex((f) => f.id === id);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    resetOutput();
  }

  function setOrderFor(id: string, order: PageOrder) {
    setFiles((current) => current.map((f) => (f.id === id ? { ...f, order } : f)));
    resetOutput();
  }

  function sortFiles(direction: "asc" | "desc") {
    setFiles((current) =>
      [...current].sort((a, b) =>
        direction === "asc" ? a.file.name.localeCompare(b.file.name) : b.file.name.localeCompare(a.file.name),
      ),
    );
    resetOutput();
  }

  async function handleCombine() {
    if (files.length < 2) return;
    setStatus("working");
    setErrorMessage("");

    try {
      const { PDFDocument } = await import("pdf-lib");
      const outDoc = await PDFDocument.create();

      const perFilePages: PDFPage[][] = [];
      for (const entry of files) {
        const doc = await PDFDocument.load(await entry.file.arrayBuffer());
        // Reversing a document before interleaving is the classic fix for
        // scanning double-sided pages as separate stacks — the back-side
        // stack usually comes out of the scanner in reverse page order.
        const indices = entry.order === "reverse" ? [...doc.getPageIndices()].reverse() : doc.getPageIndices();
        perFilePages.push(await outDoc.copyPages(doc, indices));
      }

      // Round-robin through every document, taking a block of `switchAfter`
      // pages at a time. A document that runs out just drops out of the
      // rotation instead of erroring, so uneven page counts still work.
      const chunkSize = Math.max(1, switchAfter);
      const cursors = new Array(perFilePages.length).fill(0);
      let anyRemaining = true;
      while (anyRemaining) {
        anyRemaining = false;
        for (let i = 0; i < perFilePages.length; i++) {
          const pages = perFilePages[i];
          let taken = 0;
          while (taken < chunkSize && cursors[i] < pages.length) {
            outDoc.addPage(pages[cursors[i]]);
            cursors[i]++;
            taken++;
          }
          if (cursors[i] < pages.length) anyRemaining = true;
        }
      }

      const outBytes = await outDoc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("done");
      setShowSuccessModal(true);
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        describeError(
          error,
          error instanceof Error ? `Couldn't combine these files: ${error.message}` : "Couldn't combine these files.",
        ),
      );
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []);
    if (selected.length) addFiles(selected);
    event.target.value = "";
  }

  const readyToCombine = files.length >= 2 && files.every((f) => f.pageCount !== null);
  const loadedCounts = files.map((f) => f.pageCount).filter((c): c is number => c !== null);
  const uneven = loadedCounts.length === files.length && files.length >= 2 && !loadedCounts.every((c) => c === loadedCounts[0]);

  return (
    <div className="card border border-base-300 bg-base-100 p-6 shadow-sm">
      {showSuccessModal && downloadUrl && (
        <SaveSuccessModal
          downloadUrl={downloadUrl}
          downloadFileName="alternated.pdf"
          onClose={() => setShowSuccessModal(false)}
        />
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />

      {files.length === 0 ? (
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const dropped = Array.from(event.dataTransfer.files || []).filter(
              (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
            );
            if (dropped.length) addFiles(dropped);
          }}
          className="card flex min-h-48 flex-col items-center justify-center gap-3 py-10 text-center"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ToolIcon name="upload" className="h-6 w-6" />
          </span>
          <p className="text-sm text-base-content/70">Drag &amp; drop 2 or more PDFs here, or</p>
          <div className="flex">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="btn btn-primary btn-sm rounded-r-none"
            >
              Choose Files
            </button>
            <UploadSourceMenu onFile={(file) => addFiles([file])} />
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-base-content">
              {files.length} file{files.length !== 1 ? "s" : ""} added
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {files.length >= 2 && (
                <div className="flex items-center gap-2 text-xs">
                  <button type="button" onClick={() => sortFiles("asc")} className="text-primary hover:underline">
                    Sort files A-Z
                  </button>
                  <span className="text-base-content/30">|</span>
                  <button type="button" onClick={() => sortFiles("desc")} className="text-primary hover:underline">
                    Sort files Z-A
                  </button>
                </div>
              )}
              <div className="flex">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="btn btn-primary btn-sm rounded-r-none gap-1.5"
                >
                  <ToolIcon name="upload" className="h-4 w-4" />
                  Add more files
                </button>
                <UploadSourceMenu onFile={(file) => addFiles([file])} />
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {files.map((entry, index) => (
              <div
                key={entry.id}
                className="flex flex-col gap-3 rounded-lg border border-base-300 bg-base-100 p-3 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <ToolIcon name="file" className="h-5 w-5 shrink-0 text-base-content/40" />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-base-content">{entry.file.name}</p>
                    <p className="text-xs text-base-content/50">
                      {entry.pageCount !== null ? `${entry.pageCount} pages` : "Reading…"}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <div className="join">
                    <button
                      type="button"
                      onClick={() => setOrderFor(entry.id, "regular")}
                      className={`btn btn-xs join-item ${
                        entry.order === "regular" ? "btn-primary" : "btn-ghost border border-base-300"
                      }`}
                    >
                      Regular Order
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderFor(entry.id, "reverse")}
                      title="Use this if this document is a back-side scan that came out in reverse order"
                      className={`btn btn-xs join-item ${
                        entry.order === "reverse" ? "btn-primary" : "btn-ghost border border-base-300"
                      }`}
                    >
                      Reverse Order
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveFile(entry.id, -1)}
                      disabled={index === 0}
                      aria-label="Move up"
                      title="Move up"
                      className="btn btn-ghost btn-xs btn-square disabled:opacity-30"
                    >
                      <ToolIcon name="chevron-down" className="h-4 w-4 rotate-180" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveFile(entry.id, 1)}
                      disabled={index === files.length - 1}
                      aria-label="Move down"
                      title="Move down"
                      className="btn btn-ghost btn-xs btn-square disabled:opacity-30"
                    >
                      <ToolIcon name="chevron-down" className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFile(entry.id)}
                      aria-label="Remove file"
                      title="Remove file"
                      className="btn btn-ghost btn-xs btn-square text-error"
                    >
                      <ToolIcon name="trash" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {files.length === 1 && (
            <p className="mt-3 text-xs text-base-content/50">Add at least one more PDF to alternate &amp; mix pages.</p>
          )}

          {files.length >= 2 && (
            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-lg bg-base-200/50 p-3">
              <label htmlFor="switchAfter" className="text-sm text-base-content/80">
                Switch document after reading
              </label>
              <input
                id="switchAfter"
                type="number"
                min={1}
                value={switchAfter}
                onChange={(event) => {
                  setSwitchAfter(Math.max(1, Number(event.target.value) || 1));
                  resetOutput();
                }}
                className="input input-bordered input-sm w-20"
              />
              <span className="text-sm text-base-content/80">page{switchAfter !== 1 ? "s" : ""}</span>
            </div>
          )}

          {uneven && (
            <p className="mt-3 text-xs text-base-content/50">
              These documents have different page counts — once a shorter one runs out, the rest continue cycling
              through the remaining documents.
            </p>
          )}
        </>
      )}

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      {files.length > 0 && (
        <div className="mt-5">
          {status === "done" && downloadUrl ? (
            <a href={downloadUrl} download="alternated.pdf" className="btn btn-primary w-full">
              <ToolIcon name="download" className="h-4 w-4" />
              Download Combined PDF
            </a>
          ) : (
            <button
              type="button"
              onClick={handleCombine}
              disabled={!readyToCombine || status === "working"}
              className="btn btn-primary w-full"
            >
              {status === "working" ? "Combining..." : "Alternate & Mix"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
