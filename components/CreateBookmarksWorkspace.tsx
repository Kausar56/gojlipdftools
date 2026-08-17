"use client";

import { useEffect, useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { SaveSuccessModal } from "./SaveSuccessModal";
import { loadPdfjs } from "@/lib/pdfjs";
import { describeError } from "@/lib/errorHelpers";

type Status = "idle" | "working" | "done" | "error";
type BookmarkEntry = { id: string; title: string; pageNumber: number };

const PREVIEW_WIDTH_PX = 360;

export function CreateBookmarksWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [newTitle, setNewTitle] = useState("");
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);
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
    setPageCount(null);
    setCurrentPageIndex(0);
    setBookmarks([]);
    try {
      const pdfjs = await loadPdfjs();
      const doc = await pdfjs.getDocument({ data: await selected.arrayBuffer() }).promise;
      setPageCount(doc.numPages);
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, "Couldn't read this file — make sure it's a valid PDF."));
    }
  }

  useEffect(() => {
    if (!file || !pageCount) return;
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await loadPdfjs();
        const bytes = await file.arrayBuffer();
        const doc = await pdfjs.getDocument({ data: bytes }).promise;
        const pageNumber = Math.min(Math.max(currentPageIndex + 1, 1), doc.numPages);
        const page = await doc.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: PREVIEW_WIDTH_PX / baseViewport.width });
        const canvas = previewCanvasRef.current;
        if (!canvas || cancelled) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      } catch {
        // Preview render failed — adding bookmarks by page number still works.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, pageCount, currentPageIndex]);

  function addBookmark() {
    setBookmarks((prev) => [
      ...prev,
      { id: `bm-${Date.now()}-${Math.random().toString(36).slice(2)}`, title: newTitle.trim() || `Bookmark ${prev.length + 1}`, pageNumber: currentPageIndex + 1 },
    ]);
    setNewTitle("");
    resetOutput();
  }

  function removeBookmark(id: string) {
    setBookmarks((prev) => prev.filter((bm) => bm.id !== id));
    resetOutput();
  }

  function moveBookmark(index: number, direction: -1 | 1) {
    setBookmarks((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    resetOutput();
  }

  async function handleCreate() {
    if (!file || bookmarks.length === 0 || !pageCount) return;
    setStatus("working");
    setErrorMessage("");

    try {
      const { PDFDocument, PDFDict, PDFArray, PDFName, PDFString, PDFNumber } = await import("pdf-lib");
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const context = doc.context;
      const pages = doc.getPages();

      // pdf-lib has no high-level API for writing an outline (bookmark) tree,
      // so this builds the PDF spec's Document Outline structure by hand:
      // a linked list of item dictionaries (Prev/Next/Parent) hanging off a
      // root Outlines dict, each pointing at a page via /Dest.
      const rootDict = PDFDict.withContext(context);
      const rootRef = context.register(rootDict);

      const itemDicts = bookmarks.map(() => PDFDict.withContext(context));
      const itemRefs = itemDicts.map((dict) => context.register(dict));

      bookmarks.forEach((bookmark, index) => {
        const dict = itemDicts[index];
        const pageIndex = Math.min(Math.max(bookmark.pageNumber - 1, 0), pages.length - 1);

        const dest = PDFArray.withContext(context);
        dest.push(pages[pageIndex].ref);
        dest.push(PDFName.of("Fit"));

        dict.set(PDFName.of("Title"), PDFString.of(bookmark.title));
        dict.set(PDFName.of("Parent"), rootRef);
        dict.set(PDFName.of("Dest"), dest);
        if (index > 0) dict.set(PDFName.of("Prev"), itemRefs[index - 1]);
        if (index < itemRefs.length - 1) dict.set(PDFName.of("Next"), itemRefs[index + 1]);
      });

      rootDict.set(PDFName.of("Type"), PDFName.of("Outlines"));
      rootDict.set(PDFName.of("First"), itemRefs[0]);
      rootDict.set(PDFName.of("Last"), itemRefs[itemRefs.length - 1]);
      rootDict.set(PDFName.of("Count"), PDFNumber.of(itemRefs.length));

      doc.catalog.set(PDFName.of("Outlines"), rootRef);

      const outBytes = await doc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("done");
      setShowSuccessModal(true);
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, error instanceof Error ? `Couldn't add bookmarks: ${error.message}` : "Couldn't add bookmarks to this PDF.",));
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
          downloadFileName="bookmarked.pdf"
          onClose={() => setShowSuccessModal(false)}
        />
      )}

      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 truncate">
          <ToolIcon name="file" className="h-4 w-4 text-primary" />
          <span className="truncate text-base-content/80">{file.name}</span>
          {pageCount && <span className="badge badge-neutral badge-sm">{pageCount} pages</span>}
        </span>
        <button
          type="button"
          onClick={() => {
            setFile(null);
            setPageCount(null);
            setBookmarks([]);
            resetOutput();
          }}
          className="text-xs text-base-content/50 hover:text-error"
        >
          Replace
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <div className="flex flex-col items-center gap-2 lg:flex-3">
          <div className="overflow-hidden rounded-sm border border-base-300 bg-base-200 shadow-sm">
            <canvas ref={previewCanvasRef} className="block max-w-full" />
          </div>
          {pageCount && pageCount > 1 && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentPageIndex((index) => Math.max(0, index - 1))}
                disabled={currentPageIndex === 0}
                className="btn btn-ghost btn-xs btn-square"
                aria-label="Previous page"
              >
                <ToolIcon name="chevron-down" className="h-3.5 w-3.5 rotate-90" />
              </button>
              <span className="text-xs text-base-content/60">
                Page {currentPageIndex + 1} of {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPageIndex((index) => Math.min((pageCount ?? 1) - 1, index + 1))}
                disabled={currentPageIndex === pageCount - 1}
                className="btn btn-ghost btn-xs btn-square"
                aria-label="Next page"
              >
                <ToolIcon name="chevron-down" className="h-3.5 w-3.5 -rotate-90" />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4 lg:flex-2">
          <label className="block text-sm font-medium text-base-content">
            Bookmark title
            <input
              type="text"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && addBookmark()}
              placeholder="e.g. Chapter 1"
              className="input input-bordered mt-1.5 w-full"
            />
          </label>
          <button type="button" onClick={addBookmark} className="btn btn-outline btn-sm w-full">
            Add Bookmark at Page {currentPageIndex + 1}
          </button>

          {bookmarks.length > 0 && (
            <ul className="divide-y divide-base-300 rounded-lg border border-base-300">
              {bookmarks.map((bookmark, index) => (
                <li key={bookmark.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 truncate">
                    <span className="badge badge-neutral badge-sm">p.{bookmark.pageNumber}</span>
                    <span className="truncate text-base-content/80">{bookmark.title}</span>
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveBookmark(index, -1)}
                      disabled={index === 0}
                      aria-label="Move up"
                      className="btn btn-ghost btn-xs btn-square"
                    >
                      <ToolIcon name="chevron-down" className="h-3.5 w-3.5 rotate-180" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveBookmark(index, 1)}
                      disabled={index === bookmarks.length - 1}
                      aria-label="Move down"
                      className="btn btn-ghost btn-xs btn-square"
                    >
                      <ToolIcon name="chevron-down" className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBookmark(bookmark.id)}
                      className="btn btn-ghost btn-xs text-error"
                    >
                      Remove
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      <div className="mt-6">
        {status === "done" && downloadUrl ? (
          <a href={downloadUrl} download="bookmarked.pdf" className="btn btn-primary w-full">
            <ToolIcon name="download" className="h-4 w-4" />
            Download PDF
          </a>
        ) : (
          <button
            type="button"
            onClick={handleCreate}
            disabled={bookmarks.length === 0 || status === "working"}
            className="btn btn-primary w-full"
          >
            {status === "working" ? "Adding bookmarks..." : "Create Bookmarks"}
          </button>
        )}
      </div>
    </div>
  );
}
