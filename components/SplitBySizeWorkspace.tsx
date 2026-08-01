"use client";

import { useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { formatBytes } from "@/lib/format";
import { describeError } from "@/lib/errorHelpers";

type Status = "idle" | "splitting" | "done" | "error";
type ResultItem = { label: string; filename: string; url: string; sizeBytes: number };

export function SplitBySizeWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [targetValue, setTargetValue] = useState("5");
  const [targetUnit, setTargetUnit] = useState<"MB" | "KB">("MB");
  const [status, setStatus] = useState<Status>("idle");
  const [progressLabel, setProgressLabel] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [oversizedWarning, setOversizedWarning] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);

  function resetOutput() {
    setResults((prev) => {
      prev.forEach((result) => URL.revokeObjectURL(result.url));
      return [];
    });
    setStatus("idle");
    setErrorMessage("");
    setOversizedWarning("");
  }

  async function loadFile(selected: File) {
    resetOutput();
    setFile(selected);
    setTotalPages(null);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const bytes = await selected.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      setTotalPages(doc.getPageCount());
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, "Couldn't read this file — make sure it's a valid PDF."));
    }
  }

  async function handleSplit() {
    if (!file || !totalPages) return;
    const targetBytes = (Number(targetValue) || 0) * (targetUnit === "MB" ? 1024 * 1024 : 1024);
    if (targetBytes <= 0) {
      setStatus("error");
      setErrorMessage("Enter a valid target size.");
      return;
    }

    setStatus("splitting");
    setErrorMessage("");
    setOversizedWarning("");

    try {
      const { PDFDocument } = await import("pdf-lib");
      const bytes = await file.arrayBuffer();
      const sourcePdf = await PDFDocument.load(bytes);
      const avgBytesPerPage = bytes.byteLength / totalPages || 1;

      async function buildChunk(startIndex: number, count: number) {
        const indices = Array.from({ length: count }, (_, offset) => startIndex + offset);
        const doc = await PDFDocument.create();
        const copiedPages = await doc.copyPages(sourcePdf, indices);
        copiedPages.forEach((page) => doc.addPage(page));
        return doc.save();
      }

      const outputs: ResultItem[] = [];
      let startIndex = 0;
      let oversizedPage: number | null = null;

      while (startIndex < totalPages) {
        setProgressLabel(`Building part ${outputs.length + 1}...`);
        const remaining = totalPages - startIndex;
        let count = Math.max(1, Math.min(remaining, Math.round(targetBytes / avgBytesPerPage)));
        let chunkBytes = await buildChunk(startIndex, count);

        // Estimate was too generous — shrink one page at a time until it fits
        // (or we're down to a single, unsplittable page).
        while (chunkBytes.length > targetBytes && count > 1) {
          count -= 1;
          chunkBytes = await buildChunk(startIndex, count);
        }
        if (chunkBytes.length > targetBytes && count === 1 && oversizedPage === null) {
          oversizedPage = startIndex + 1;
        }

        // Estimate was too conservative — grow one page at a time while it
        // still fits, so parts aren't smaller than they need to be.
        while (count < remaining) {
          const grown = await buildChunk(startIndex, count + 1);
          if (grown.length > targetBytes) break;
          count += 1;
          chunkBytes = grown;
        }

        const blob = new Blob([chunkBytes as BlobPart], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const partNumber = outputs.length + 1;
        const first = startIndex + 1;
        const last = startIndex + count;
        outputs.push({
          label: `Part ${partNumber} — pages ${first}-${last}`,
          filename: `part-${String(partNumber).padStart(2, "0")}.pdf`,
          url,
          sizeBytes: chunkBytes.length,
        });

        startIndex += count;
      }

      if (oversizedPage !== null) {
        setOversizedWarning(
          `Page ${oversizedPage} alone is larger than your target size — a single page can't be split further, so that part is over the limit.`,
        );
      }

      setResults(outputs);
      setStatus("done");
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, error instanceof Error ? `Couldn't split this PDF: ${error.message}` : "Couldn't split this PDF.",));
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
          <span className="badge badge-neutral badge-sm">{formatBytes(file.size)}</span>
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
          <p className="text-sm font-medium text-base-content">Target size per part</p>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={targetValue}
              onChange={(event) => {
                setTargetValue(event.target.value);
                resetOutput();
              }}
              className="input input-bordered w-28"
            />
            <select
              value={targetUnit}
              onChange={(event) => {
                setTargetUnit(event.target.value as "MB" | "KB");
                resetOutput();
              }}
              className="select select-bordered"
            >
              <option value="MB">MB</option>
              <option value="KB">KB</option>
            </select>
          </div>
          <p className="mt-1.5 text-xs text-base-content/50">
            Gojli groups consecutive pages into parts that each stay under this size.
          </p>
        </div>
      )}

      {status === "splitting" && (
        <p className="mt-4 text-center text-xs text-base-content/60">{progressLabel}</p>
      )}

      {oversizedWarning && (
        <p className="mt-4 rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">{oversizedWarning}</p>
      )}

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      {results.length > 0 && (
        <ul className="mt-5 space-y-2">
          {results.map((result) => (
            <li
              key={result.filename}
              className="flex items-center justify-between gap-3 rounded-lg border border-base-300 px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2 truncate text-base-content/80">
                {result.label}
                <span className="badge badge-neutral badge-sm shrink-0">{formatBytes(result.sizeBytes)}</span>
              </span>
              <a href={result.url} download={result.filename} className="btn btn-primary btn-xs shrink-0">
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
        {status === "splitting" ? "Splitting..." : "Split by Size"}
      </button>
    </div>
  );
}
