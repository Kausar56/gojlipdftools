"use client";

import { useEffect, useRef, useState } from "react";
import { ToolIcon } from "./icons";

type FileItem = {
  id: string;
  file: File;
};

type Status = "idle" | "merging" | "done" | "error";

export function MergePdfWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<FileItem[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  function resetOutput() {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setStatus("idle");
    setErrorMessage("");
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const next = Array.from(fileList).map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
      file,
    }));
    setItems((prev) => [...prev, ...next]);
    resetOutput();
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
    resetOutput();
  }

  function moveItem(index: number, direction: -1 | 1) {
    setItems((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleMerge() {
    if (items.length < 2) return;
    setStatus("merging");
    setErrorMessage("");

    try {
      const { PDFDocument } = await import("pdf-lib");
      const mergedPdf = await PDFDocument.create();

      for (const item of items) {
        const bytes = await item.file.arrayBuffer();
        const sourcePdf = await PDFDocument.load(bytes);
        const copiedPages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("done");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? `Couldn't merge these files: ${error.message}`
          : "Couldn't merge these files. Make sure they're all valid PDFs.",
      );
    }
  }

  return (
    <div className="card p-6">
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          addFiles(event.dataTransfer.files);
        }}
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl px-6 py-8 text-center"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ToolIcon name="upload" className="h-6 w-6" />
        </span>
        <p className="text-sm text-base-content/70">Drag & drop PDF files here, or</p>
        <button type="button" onClick={() => inputRef.current?.click()} className="btn btn-primary btn-md">
          Choose Files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="application/pdf"
          className="hidden"
          onChange={(event) => addFiles(event.target.files)}
        />
      </div>

      {items.length > 0 && (
        <ul className="mt-4 divide-y divide-base-300">
          {items.map((item, index) => (
            <li key={item.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span className="flex items-center gap-2 truncate">
                <span className="badge badge-neutral badge-sm">{index + 1}</span>
                <span className="truncate text-base-content/80">{item.file.name}</span>
              </span>
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveItem(index, -1)}
                  disabled={index === 0}
                  aria-label="Move up"
                  className="btn btn-ghost btn-xs btn-square"
                >
                  <ToolIcon name="chevron-down" className="h-3.5 w-3.5 rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(index, 1)}
                  disabled={index === items.length - 1}
                  aria-label="Move down"
                  className="btn btn-ghost btn-xs btn-square"
                >
                  <ToolIcon name="chevron-down" className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="btn btn-ghost btn-xs text-error"
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {status === "done" && downloadUrl ? (
          <a href={downloadUrl} download="merged.pdf" className="btn btn-primary flex-1">
            <ToolIcon name="download" className="h-4 w-4" />
            Download Merged PDF
          </a>
        ) : (
          <button
            type="button"
            onClick={handleMerge}
            disabled={items.length < 2 || status === "merging"}
            className="btn btn-primary flex-1"
          >
            {status === "merging" ? "Merging..." : "Merge PDF"}
          </button>
        )}
      </div>
      {items.length === 1 && (
        <p className="mt-2 text-xs text-base-content/50">Add at least one more PDF to merge.</p>
      )}
    </div>
  );
}
