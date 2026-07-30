"use client";

import { useEffect, useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { parsePageGroups } from "@/lib/pageRanges";
import { describeError } from "@/lib/errorHelpers";

type ResultItem = {
  label: string;
  filename: string;
  url: string;
};

type Status = "idle" | "splitting" | "done" | "error";

export function SplitPdfWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [rangeInput, setRangeInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);

  useEffect(() => {
    return () => {
      results.forEach((result) => URL.revokeObjectURL(result.url));
    };
  }, [results]);

  function reset() {
    setResults((prev) => {
      prev.forEach((result) => URL.revokeObjectURL(result.url));
      return [];
    });
    setStatus("idle");
    setErrorMessage("");
  }

  async function loadFile(selected: File) {
    reset();
    setFile(selected);
    setTotalPages(null);
    setRangeInput("");
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

  function useSplitInHalf() {
    if (!totalPages) return;
    const half = Math.ceil(totalPages / 2);
    setRangeInput(`1-${half}, ${half + 1}-${totalPages}`);
  }

  function useSplitEveryPage() {
    if (!totalPages) return;
    setRangeInput(Array.from({ length: totalPages }, (_, index) => index + 1).join(", "));
  }

  async function handleSplit() {
    if (!file || !totalPages) return;
    const parsed = parsePageGroups(rangeInput, totalPages);
    if ("error" in parsed) {
      setStatus("error");
      setErrorMessage(parsed.error);
      return;
    }

    setStatus("splitting");
    setErrorMessage("");

    try {
      const { PDFDocument } = await import("pdf-lib");
      const bytes = await file.arrayBuffer();
      const sourcePdf = await PDFDocument.load(bytes);
      const outputs: ResultItem[] = [];

      for (const pageIndices of parsed) {
        const newDoc = await PDFDocument.create();
        const copiedPages = await newDoc.copyPages(sourcePdf, pageIndices);
        copiedPages.forEach((page) => newDoc.addPage(page));
        const outBytes = await newDoc.save();
        const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);

        const first = pageIndices[0] + 1;
        const last = pageIndices[pageIndices.length - 1] + 1;
        const label = first === last ? `Page ${first}` : `Pages ${first}-${last}`;
        const filename = first === last ? `page-${first}.pdf` : `pages-${first}-${last}.pdf`;
        outputs.push({ label, filename, url });
      }

      setResults(outputs);
      setStatus("done");
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, error instanceof Error
          ? `Couldn't split this PDF: ${error.message}`
          : "Couldn't split this PDF.",));
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
          <ToolIcon name="split" className="h-4 w-4 text-secondary" />
          <span className="truncate text-base-content/80">{file.name}</span>
          {totalPages && <span className="badge badge-neutral badge-sm">{totalPages} pages</span>}
        </span>
        <button
          type="button"
          onClick={() => {
            setFile(null);
            setTotalPages(null);
            reset();
          }}
          className="text-xs text-base-content/50 hover:text-error"
        >
          Replace
        </button>
      </div>

      {totalPages && (
        <div className="mt-5">
          <label className="text-sm font-medium text-base-content">
            Page ranges
            <input
              type="text"
              value={rangeInput}
              onChange={(event) => setRangeInput(event.target.value)}
              placeholder={`e.g. 1-3, 5, 8-${totalPages}`}
              className="input input-bordered mt-1.5 w-full"
            />
          </label>
          <p className="mt-1.5 text-xs text-base-content/50">
            Each comma-separated group becomes its own PDF. This file has {totalPages} page
            {totalPages === 1 ? "" : "s"}.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={useSplitInHalf} className="btn btn-outline btn-xs">
              Split in Half
            </button>
            <button type="button" onClick={useSplitEveryPage} className="btn btn-outline btn-xs">
              Split Every Page
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      {results.length > 0 && (
        <ul className="mt-5 space-y-2">
          {results.map((result) => (
            <li key={result.filename} className="flex items-center justify-between gap-3 rounded-lg border border-base-300 px-3 py-2 text-sm">
              <span className="text-base-content/80">{result.label}</span>
              <a href={result.url} download={result.filename} className="btn btn-primary btn-xs">
                <ToolIcon name="download" className="h-3.5 w-3.5" />
                Download
              </a>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={handleSplit}
        disabled={!totalPages || status === "splitting"}
        className="btn btn-primary mt-5 w-full"
      >
        {status === "splitting" ? "Splitting..." : "Split PDF"}
      </button>
    </div>
  );
}
