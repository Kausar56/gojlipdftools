"use client";

import { useEffect, useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { SaveSuccessModal } from "./SaveSuccessModal";
import { loadPdfjs } from "@/lib/pdfjs";
import { describeError } from "@/lib/errorHelpers";

type Status = "idle" | "working" | "done" | "error";

const PREVIEW_WIDTH_PX = 420;
const MAX_ANGLE = 15;

export function DeskewWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  // Only pages the user actually adjusts end up here — every other page is
  // left completely untouched.
  const [angles, setAngles] = useState<Record<number, number>>({});
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
    setAngles({});
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
        // Preview render failed — the angle can still be set and applied.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, pageCount, currentPageIndex]);

  const currentAngle = angles[currentPageIndex] ?? 0;

  function setCurrentAngle(angle: number) {
    setAngles((prev) => ({ ...prev, [currentPageIndex]: angle }));
    resetOutput();
  }

  async function handleDeskew() {
    if (!file) return;
    const pageIndices = Object.keys(angles)
      .map(Number)
      .filter((index) => angles[index] !== 0);
    if (pageIndices.length === 0) {
      setStatus("error");
      setErrorMessage("Adjust the angle on at least one page first.");
      return;
    }

    setStatus("working");
    setErrorMessage("");

    try {
      const { PDFDocument, concatTransformationMatrix, pushGraphicsState, popGraphicsState, PDFContentStream } =
        await import("pdf-lib");
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const context = doc.context;
      const pages = doc.getPages();

      for (const pageIndex of pageIndices) {
        const page = pages[pageIndex];
        if (!page) continue;
        const angleDeg = angles[pageIndex];
        const { x: mx, y: my, width, height } = page.getMediaBox();
        const cx = mx + width / 2;
        const cy = my + height / 2;
        // Negative because PDF's rotation direction (counter-clockwise from
        // the positive x-axis) is opposite the CSS preview's clockwise
        // rotate(), which is what the angle was dialed in against.
        const angleRad = (-angleDeg * Math.PI) / 180;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);

        // Rotating about the page's own center (not the origin) — the same
        // low-level content-stream-wrapping technique as the Flip tool,
        // since pdf-lib has no high-level API for rotating existing content
        // by an arbitrary angle (only 90°-step page rotation).
        page.node.normalize();
        const matrix = concatTransformationMatrix(
          cos,
          sin,
          -sin,
          cos,
          cx - cos * cx + sin * cy,
          cy - sin * cx - cos * cy,
        );
        const startRef = context.register(PDFContentStream.of(context.obj({}), [pushGraphicsState(), matrix]));
        const endRef = context.register(PDFContentStream.of(context.obj({}), [popGraphicsState()]));
        page.node.wrapContentStreams(startRef, endRef);
      }

      const outBytes = await doc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("done");
      setShowSuccessModal(true);
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, error instanceof Error ? `Couldn't straighten this PDF: ${error.message}` : "Couldn't straighten this PDF.",));
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
        <p className="text-sm text-base-content/70">Drag & drop a scanned PDF here, or</p>
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
          downloadFileName="deskewed.pdf"
          onClose={() => setShowSuccessModal(false)}
        />
      )}

      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 truncate">
          <ToolIcon name="rotate-pdf" className="h-4 w-4 text-secondary" />
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

      <p className="mt-3 text-xs text-base-content/50">
        This straightens a page by an angle you dial in by eye — there's no automatic crooked-scan
        detection, just a live preview to help you match it precisely.
      </p>

      <div className="mt-4 flex flex-col items-center gap-2">
        <div className="overflow-hidden rounded-sm border border-base-300 bg-base-200 shadow-sm">
          <canvas
            ref={previewCanvasRef}
            className="block max-w-full transition-transform"
            style={{ transform: `rotate(${currentAngle}deg)` }}
          />
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
              {currentPageIndex in angles && angles[currentPageIndex] !== 0 && (
                <span className="ml-1 text-primary">(adjusted)</span>
              )}
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

        <div className="w-full max-w-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-base-content">Angle — {currentAngle.toFixed(1)}°</p>
            {currentAngle !== 0 && (
              <button
                type="button"
                onClick={() => setCurrentAngle(0)}
                className="text-xs text-primary hover:underline"
              >
                Reset
              </button>
            )}
          </div>
          <input
            type="range"
            min={-MAX_ANGLE}
            max={MAX_ANGLE}
            step={0.1}
            value={currentAngle}
            onChange={(event) => setCurrentAngle(Number(event.target.value))}
            className="range range-sm range-primary mt-1.5 w-full"
          />
        </div>
      </div>

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      <div className="mt-6">
        {status === "done" && downloadUrl ? (
          <a href={downloadUrl} download="deskewed.pdf" className="btn btn-primary w-full">
            <ToolIcon name="download" className="h-4 w-4" />
            Download Straightened PDF
          </a>
        ) : (
          <button
            type="button"
            onClick={handleDeskew}
            disabled={status === "working"}
            className="btn btn-primary w-full"
          >
            {status === "working" ? "Straightening..." : "Straighten PDF"}
          </button>
        )}
      </div>
    </div>
  );
}
