"use client";

import { useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { loadPdfjs } from "@/lib/pdfjs";
import { describeError } from "@/lib/errorHelpers";

type Status = "idle" | "reading" | "splitting" | "done" | "error";
type ResultItem = { label: string; filename: string; url: string };
type Bookmark = { title: string; pageIndex: number };

function slugify(title: string, fallback: string) {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || fallback;
}

async function resolveDestPageIndex(
  doc: import("pdfjs-dist").PDFDocumentProxy,
  dest: string | unknown[] | null,
): Promise<number | null> {
  try {
    const destArray = typeof dest === "string" ? await doc.getDestination(dest) : dest;
    if (!destArray || !Array.isArray(destArray)) return null;
    const ref = destArray[0];
    if (ref == null) return null;
    return await doc.getPageIndex(ref);
  } catch {
    return null;
  }
}

export function SplitByBookmarksWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[] | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);

  function resetOutput() {
    setResults((prev) => {
      prev.forEach((result) => URL.revokeObjectURL(result.url));
      return [];
    });
    setStatus("idle");
    setErrorMessage("");
  }

  async function loadFile(selected: File) {
    resetOutput();
    setFile(selected);
    setTotalPages(null);
    setBookmarks(null);
    setStatus("reading");

    try {
      const pdfjs = await loadPdfjs();
      const bytes = await selected.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: bytes }).promise;
      setTotalPages(doc.numPages);

      const outline = await doc.getOutline();
      if (!outline || outline.length === 0) {
        setBookmarks([]);
        setStatus("idle");
        return;
      }

      // Top-level bookmarks only — the common "one file per chapter" case.
      // Nested sub-bookmarks aren't split points of their own here.
      const resolved: Bookmark[] = [];
      for (const node of outline) {
        const pageIndex = await resolveDestPageIndex(doc, node.dest);
        if (pageIndex !== null) resolved.push({ title: node.title.trim() || "Untitled", pageIndex });
      }

      resolved.sort((a, b) => a.pageIndex - b.pageIndex);
      // Bookmarks pointing at the same page as one already kept would produce
      // a zero-length section — keep only the first title for that page.
      const deduped = resolved.filter((bm, index) => index === 0 || bm.pageIndex !== resolved[index - 1].pageIndex);

      setBookmarks(deduped);
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, "Couldn't read this file — make sure it's a valid PDF."));
    }
  }

  async function handleSplit() {
    if (!file || !totalPages || !bookmarks || bookmarks.length === 0) return;
    setStatus("splitting");
    setErrorMessage("");

    try {
      const { PDFDocument } = await import("pdf-lib");
      const bytes = await file.arrayBuffer();
      const sourcePdf = await PDFDocument.load(bytes);

      // Anything before the first bookmark (a cover page, table of contents,
      // etc.) becomes its own leading section instead of being silently
      // dropped.
      const sections: { title: string; startIndex: number; endIndex: number }[] = [];
      if (bookmarks[0].pageIndex > 0) {
        sections.push({ title: "Before first bookmark", startIndex: 0, endIndex: bookmarks[0].pageIndex - 1 });
      }
      bookmarks.forEach((bm, index) => {
        const endIndex = index + 1 < bookmarks.length ? bookmarks[index + 1].pageIndex - 1 : totalPages - 1;
        sections.push({ title: bm.title, startIndex: bm.pageIndex, endIndex });
      });

      const outputs: ResultItem[] = [];
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const pageIndices = Array.from(
          { length: section.endIndex - section.startIndex + 1 },
          (_, offset) => section.startIndex + offset,
        );
        const newDoc = await PDFDocument.create();
        const copiedPages = await newDoc.copyPages(sourcePdf, pageIndices);
        copiedPages.forEach((page) => newDoc.addPage(page));
        const outBytes = await newDoc.save();
        const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);

        outputs.push({
          label: section.title,
          filename: `${String(i + 1).padStart(2, "0")}-${slugify(section.title, `section-${i + 1}`)}.pdf`,
          url,
        });
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
            setBookmarks(null);
            resetOutput();
          }}
          className="text-xs text-base-content/50 hover:text-error"
        >
          Replace
        </button>
      </div>

      {status === "reading" && (
        <p className="mt-5 text-center text-sm text-base-content/60">Reading bookmarks...</p>
      )}

      {bookmarks !== null && bookmarks.length === 0 && (
        <p className="mt-5 rounded-lg border border-base-300 bg-base-200 px-3 py-2 text-sm text-base-content/70">
          This PDF has no bookmarks (outline entries) to split by. Try the plain Split PDF tool instead if you
          want to split by page ranges.
        </p>
      )}

      {bookmarks !== null && bookmarks.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-medium text-base-content">
            {bookmarks.length} bookmark{bookmarks.length === 1 ? "" : "s"} found — each becomes its own PDF
          </p>
          <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-base-300 p-2 text-sm">
            {bookmarks.map((bm, index) => (
              <li key={`${bm.pageIndex}-${index}`} className="flex items-center justify-between gap-2 text-base-content/80">
                <span className="truncate">{bm.title}</span>
                <span className="shrink-0 text-xs text-base-content/50">starts at page {bm.pageIndex + 1}</span>
              </li>
            ))}
          </ul>
        </div>
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

      {bookmarks !== null && bookmarks.length > 0 && (
        <button
          type="button"
          onClick={handleSplit}
          disabled={status === "splitting"}
          className="btn btn-primary mt-5 w-full"
        >
          {status === "splitting" ? "Splitting..." : "Split by Bookmarks"}
        </button>
      )}
    </div>
  );
}
