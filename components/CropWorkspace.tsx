"use client";

import { useEffect, useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { SaveSuccessModal } from "./SaveSuccessModal";
import { loadPdfjs } from "@/lib/pdfjs";
import { describeError } from "@/lib/errorHelpers";

type Status = "idle" | "working" | "done" | "error";
type CropRect = { x: number; y: number; width: number; height: number };
type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const PREVIEW_WIDTH_PX = 420;
const MIN_SIZE_PCT = 0.05;
const DEFAULT_RECT: CropRect = { x: 0.05, y: 0.05, width: 0.9, height: 0.9 };

const RESIZE_HANDLES: { dir: ResizeHandle; position: string; cursor: string }[] = [
  { dir: "nw", position: "-top-1.5 -left-1.5", cursor: "cursor-nwse-resize" },
  { dir: "n", position: "-top-1.5 left-1/2 -translate-x-1/2", cursor: "cursor-ns-resize" },
  { dir: "ne", position: "-top-1.5 -right-1.5", cursor: "cursor-nesw-resize" },
  { dir: "e", position: "top-1/2 -right-1.5 -translate-y-1/2", cursor: "cursor-ew-resize" },
  { dir: "se", position: "-bottom-1.5 -right-1.5", cursor: "cursor-nwse-resize" },
  { dir: "s", position: "-bottom-1.5 left-1/2 -translate-x-1/2", cursor: "cursor-ns-resize" },
  { dir: "sw", position: "-bottom-1.5 -left-1.5", cursor: "cursor-nesw-resize" },
  { dir: "w", position: "top-1/2 -left-1.5 -translate-y-1/2", cursor: "cursor-ew-resize" },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function CropWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pageSizePt, setPageSizePt] = useState<{ width: number; height: number } | null>(null);
  // Only pages the user actually drags/resizes the crop box on end up in
  // here — every other page is left completely uncropped when applying
  // per-page, so just viewing a page never accidentally crops it.
  const [cropRects, setCropRects] = useState<Record<number, CropRect>>({});
  const [applyToAll, setApplyToAll] = useState(true);
  const cropRect = cropRects[currentPageIndex] ?? DEFAULT_RECT;
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
    setCropRects({});
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
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        if (cancelled) return;
        setPageSizePt({ width: baseViewport.width, height: baseViewport.height });
      } catch {
        if (!cancelled) setPageSizePt(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, pageCount, currentPageIndex]);

  function startMove(event: React.PointerEvent) {
    event.stopPropagation();
    const box = previewBoxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const start = { ...cropRect };
    const pageIndex = currentPageIndex;

    function onMove(moveEvent: PointerEvent) {
      const dx = (moveEvent.clientX - startX) / rect.width;
      const dy = (moveEvent.clientY - startY) / rect.height;
      setCropRects((prev) => ({
        ...prev,
        [pageIndex]: {
          ...start,
          x: clamp(start.x + dx, 0, 1 - start.width),
          y: clamp(start.y + dy, 0, 1 - start.height),
        },
      }));
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      resetOutput();
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function startResize(handle: ResizeHandle, event: React.PointerEvent) {
    event.stopPropagation();
    const box = previewBoxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const start = { ...cropRect };
    const pageIndex = currentPageIndex;
    const west = handle.includes("w");
    const east = handle.includes("e");
    const north = handle.includes("n");
    const south = handle.includes("s");

    function onMove(moveEvent: PointerEvent) {
      const dx = (moveEvent.clientX - startX) / rect.width;
      const dy = (moveEvent.clientY - startY) / rect.height;
      let { x, y, width, height } = start;

      if (east) {
        width = clamp(start.width + dx, MIN_SIZE_PCT, 1 - start.x);
      } else if (west) {
        const newWidth = clamp(start.width - dx, MIN_SIZE_PCT, start.x + start.width);
        width = newWidth;
        x = start.x + start.width - newWidth;
      }
      if (south) {
        height = clamp(start.height + dy, MIN_SIZE_PCT, 1 - start.y);
      } else if (north) {
        const newHeight = clamp(start.height - dy, MIN_SIZE_PCT, start.y + start.height);
        height = newHeight;
        y = start.y + start.height - newHeight;
      }
      setCropRects((prev) => ({ ...prev, [pageIndex]: { x, y, width, height } }));
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      resetOutput();
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  async function handleCrop() {
    if (!file || !pageSizePt) return;
    if (!applyToAll && Object.keys(cropRects).length === 0) {
      setStatus("error");
      setErrorMessage("Drag the crop box on at least one page first (or check \"Apply to all pages\").");
      return;
    }

    setStatus("working");
    setErrorMessage("");

    try {
      const { PDFDocument } = await import("pdf-lib");
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const pages = doc.getPages();

      function applyCrop(page: (typeof pages)[number], rect: CropRect) {
        const { width, height } = page.getSize();
        const x = rect.x * width;
        const y = height - (rect.y + rect.height) * height;
        const w = rect.width * width;
        const h = rect.height * height;
        page.setCropBox(x, y, w, h);
      }

      if (applyToAll) {
        pages.forEach((page) => applyCrop(page, cropRect));
      } else {
        for (const [pageIndex, rect] of Object.entries(cropRects)) {
          const page = pages[Number(pageIndex)];
          if (page) applyCrop(page, rect);
        }
      }

      const outBytes = await doc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("done");
      setShowSuccessModal(true);
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, error instanceof Error ? `Couldn't crop this PDF: ${error.message}` : "Couldn't crop this PDF.",));
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
          downloadFileName="cropped.pdf"
          onClose={() => setShowSuccessModal(false)}
        />
      )}

      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 truncate">
          <ToolIcon name="crop" className="h-4 w-4 text-primary" />
          <span className="truncate text-base-content/80">{file.name}</span>
          {pageCount && <span className="badge badge-neutral badge-sm">{pageCount} pages</span>}
        </span>
        <button
          type="button"
          onClick={() => {
            setFile(null);
            setPageCount(null);
            resetOutput();
          }}
          className="text-xs text-base-content/50 hover:text-error"
        >
          Replace
        </button>
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        <div
          ref={previewBoxRef}
          className="relative select-none overflow-hidden rounded-sm border border-base-300 bg-base-200 shadow-sm"
          style={{ touchAction: "none" }}
        >
          <canvas ref={canvasRef} className="block max-w-full" />

          {pageSizePt && (
            <>
              {/* Dims everything outside the crop rectangle with four bars
                  around it, rather than a clip-path mask, to keep this
                  simple and broadly supported. */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 bg-black/50"
                style={{ height: `${cropRect.y * 100}%` }}
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/50"
                style={{ height: `${(1 - cropRect.y - cropRect.height) * 100}%` }}
              />
              <div
                className="pointer-events-none absolute bg-black/50"
                style={{
                  top: `${cropRect.y * 100}%`,
                  left: 0,
                  width: `${cropRect.x * 100}%`,
                  height: `${cropRect.height * 100}%`,
                }}
              />
              <div
                className="pointer-events-none absolute bg-black/50"
                style={{
                  top: `${cropRect.y * 100}%`,
                  right: 0,
                  width: `${(1 - cropRect.x - cropRect.width) * 100}%`,
                  height: `${cropRect.height * 100}%`,
                }}
              />

              <div
                onPointerDown={startMove}
                style={{
                  position: "absolute",
                  left: `${cropRect.x * 100}%`,
                  top: `${cropRect.y * 100}%`,
                  width: `${cropRect.width * 100}%`,
                  height: `${cropRect.height * 100}%`,
                  touchAction: "none",
                }}
                className="cursor-move border-2 border-dashed border-primary"
              >
                {RESIZE_HANDLES.map((h) => (
                  <div
                    key={h.dir}
                    onPointerDown={(event) => startResize(h.dir, event)}
                    style={{ touchAction: "none" }}
                    className={`absolute z-10 h-3 w-3 rounded-sm border border-white bg-primary ${h.position} ${h.cursor}`}
                  />
                ))}
              </div>
            </>
          )}
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
              {currentPageIndex in cropRects && <span className="ml-1 text-primary">(custom)</span>}
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

        {pageCount && pageCount > 1 && (
          <div>
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
              Apply the current crop box to all {pageCount} pages
            </label>
            {!applyToAll && (
              <p className="mt-1 text-xs text-base-content/50">
                Only pages you've dragged the crop box on will be cropped — move to another page and adjust it
                there for a different crop per page.
              </p>
            )}
          </div>
        )}
      </div>

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      <div className="mt-6">
        {status === "done" && downloadUrl ? (
          <a href={downloadUrl} download="cropped.pdf" className="btn btn-primary w-full">
            <ToolIcon name="download" className="h-4 w-4" />
            Download Cropped PDF
          </a>
        ) : (
          <button
            type="button"
            onClick={handleCrop}
            disabled={!pageSizePt || status === "working"}
            className="btn btn-primary w-full"
          >
            {status === "working" ? "Cropping..." : "Crop PDF"}
          </button>
        )}
      </div>
    </div>
  );
}
