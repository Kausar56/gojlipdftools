"use client";

import { useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { loadPdfjs } from "@/lib/pdfjs";
import { describeError } from "@/lib/errorHelpers";

type Status = "idle" | "splitting" | "done" | "error";
type ResultItem = { label: string; filename: string; url: string };

export function SplitByTextWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [progressLabel, setProgressLabel] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [noMatchWarning, setNoMatchWarning] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);

  function resetOutput() {
    setResults((prev) => {
      prev.forEach((result) => URL.revokeObjectURL(result.url));
      return [];
    });
    setStatus("idle");
    setErrorMessage("");
    setNoMatchWarning("");
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
    if (!file || !totalPages || !searchQuery.trim()) return;
    setStatus("splitting");
    setErrorMessage("");
    setNoMatchWarning("");

    try {
      const pdfjs = await loadPdfjs();
      const bytes = await file.arrayBuffer();
      const pdfjsDoc = await pdfjs.getDocument({ data: bytes.slice(0) }).promise;
      const needle = matchCase ? searchQuery : searchQuery.toLowerCase();
      const matchedPages: number[] = [];

      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        setProgressLabel(`Scanning page ${pageIndex + 1} of ${totalPages}...`);
        const page = await pdfjsDoc.getPage(pageIndex + 1);
        const content = await page.getTextContent();
        const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
        const haystack = matchCase ? text : text.toLowerCase();
        if (haystack.includes(needle)) matchedPages.push(pageIndex);
      }

      // Page 0 always starts the first part regardless of whether it also
      // matches — every OTHER matching page starts a new part.
      const startIndices = Array.from(new Set([0, ...matchedPages.filter((i) => i !== 0)])).sort((a, b) => a - b);

      const { PDFDocument } = await import("pdf-lib");
      const sourcePdf = await PDFDocument.load(bytes);
      const outputs: ResultItem[] = [];

      for (let s = 0; s < startIndices.length; s++) {
        setProgressLabel(`Building part ${s + 1} of ${startIndices.length}...`);
        const start = startIndices[s];
        const end = s + 1 < startIndices.length ? startIndices[s + 1] - 1 : totalPages - 1;
        const indices = Array.from({ length: end - start + 1 }, (_, offset) => start + offset);

        const newDoc = await PDFDocument.create();
        const copiedPages = await newDoc.copyPages(sourcePdf, indices);
        copiedPages.forEach((page) => newDoc.addPage(page));
        const outBytes = await newDoc.save();
        const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);

        outputs.push({
          label: `Part ${s + 1} — pages ${start + 1}-${end + 1}`,
          filename: `part-${String(s + 1).padStart(2, "0")}.pdf`,
          url,
        });
      }

      if (matchedPages.filter((i) => i !== 0).length === 0) {
        setNoMatchWarning(
          `No page (besides possibly the first) contains "${searchQuery}" — the whole document was kept as one file.`,
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
          <label className="block text-sm font-medium text-base-content">
            Split wherever this text appears
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                resetOutput();
              }}
              placeholder="e.g. INVOICE, Chapter, Account Number"
              className="input input-bordered mt-1.5 w-full"
            />
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm text-base-content/70">
            <input
              type="checkbox"
              checked={matchCase}
              onChange={(event) => {
                setMatchCase(event.target.checked);
                resetOutput();
              }}
              className="checkbox checkbox-sm"
            />
            Match case
          </label>
          <p className="mt-1.5 text-xs text-base-content/50">
            Every page containing this text (except possibly the first page) starts a new part.
          </p>
        </div>
      )}

      {status === "splitting" && (
        <p className="mt-4 text-center text-xs text-base-content/60">{progressLabel}</p>
      )}

      {noMatchWarning && (
        <p className="mt-4 rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">{noMatchWarning}</p>
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
              <span className="truncate text-base-content/80">{result.label}</span>
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
        disabled={!totalPages || !searchQuery.trim() || status === "splitting"}
        className="btn btn-primary mt-5 w-full"
      >
        {status === "splitting" ? "Splitting..." : "Split by Text"}
      </button>
    </div>
  );
}
