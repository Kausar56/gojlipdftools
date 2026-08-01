"use client";

import { useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { loadPdfjs } from "@/lib/pdfjs";
import { describeError } from "@/lib/errorHelpers";

type Status = "idle" | "rendering" | "working" | "done" | "error";
type FlipState = { horizontal: boolean; vertical: boolean };

const THUMB_WIDTH = 200;

export function FlipWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [flips, setFlips] = useState<FlipState[]>([]);
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
    setThumbnails([]);
    setFlips([]);
    setStatus("rendering");

    try {
      const pdfjs = await loadPdfjs();
      const bytes = await selected.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: bytes }).promise;
      const thumbs: string[] = [];

      for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
        const page = await doc.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: THUMB_WIDTH / baseViewport.width });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        thumbs.push(canvas.toDataURL("image/jpeg", 0.8));
      }

      setThumbnails(thumbs);
      setFlips(thumbs.map(() => ({ horizontal: false, vertical: false })));
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, "Couldn't read this file — make sure it's a valid PDF."));
    }
  }

  function toggleFlip(index: number, axis: "horizontal" | "vertical") {
    setFlips((prev) => prev.map((flip, i) => (i === index ? { ...flip, [axis]: !flip[axis] } : flip)));
    resetOutput();
  }

  function toggleAll(axis: "horizontal" | "vertical") {
    setFlips((prev) => {
      // If every page already has this axis flipped, turn it off for all;
      // otherwise turn it on for all — a single button doubles as on/off.
      const allOn = prev.every((flip) => flip[axis]);
      return prev.map((flip) => ({ ...flip, [axis]: !allOn }));
    });
    resetOutput();
  }

  function resetAll() {
    setFlips((prev) => prev.map(() => ({ horizontal: false, vertical: false })));
    resetOutput();
  }

  async function handleFlip() {
    if (!file || flips.length === 0) return;
    setStatus("working");
    setErrorMessage("");

    try {
      const { PDFDocument, concatTransformationMatrix, pushGraphicsState, popGraphicsState, PDFContentStream } =
        await import("pdf-lib");
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const context = doc.context;

      doc.getPages().forEach((page, index) => {
        const flip = flips[index];
        if (!flip || (!flip.horizontal && !flip.vertical)) return;

        const { x: mx, y: my, width, height } = page.getMediaBox();

        // Mirroring existing page content isn't possible via any high-level
        // pdf-lib API — a rotation only ever turns a page, it can't reverse
        // its handedness. This wraps the page's existing content stream(s)
        // in q [flip matrix] ... Q, the same low-level technique pdf-lib
        // itself uses internally (PDFPageLeaf.wrapContentStreams) to safely
        // isolate graphics state changes around existing content.
        page.node.normalize();
        const matrix = concatTransformationMatrix(
          flip.horizontal ? -1 : 1,
          0,
          0,
          flip.vertical ? -1 : 1,
          flip.horizontal ? 2 * mx + width : 0,
          flip.vertical ? 2 * my + height : 0,
        );
        const startRef = context.register(PDFContentStream.of(context.obj({}), [pushGraphicsState(), matrix]));
        const endRef = context.register(PDFContentStream.of(context.obj({}), [popGraphicsState()]));
        page.node.wrapContentStreams(startRef, endRef);
      });

      const outBytes = await doc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("done");
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, error instanceof Error ? `Couldn't flip this PDF: ${error.message}` : "Couldn't flip this PDF.",));
    }
  }

  const hasAnyFlip = flips.some((flip) => flip.horizontal || flip.vertical);

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
          <ToolIcon name="flip-h" className="h-4 w-4 text-secondary" />
          <span className="truncate text-base-content/80">{file.name}</span>
          {thumbnails.length > 0 && <span className="badge badge-neutral badge-sm">{thumbnails.length} pages</span>}
        </span>
        <button
          type="button"
          onClick={() => {
            setFile(null);
            setThumbnails([]);
            setFlips([]);
            resetOutput();
          }}
          className="text-xs text-base-content/50 hover:text-error"
        >
          Replace
        </button>
      </div>

      {status === "rendering" && (
        <p className="mt-6 text-center text-sm text-base-content/60">Rendering page previews...</p>
      )}

      {thumbnails.length > 0 && (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => toggleAll("horizontal")} className="btn btn-outline btn-sm">
              <ToolIcon name="flip-h" className="h-4 w-4" />
              Flip All Horizontal
            </button>
            <button type="button" onClick={() => toggleAll("vertical")} className="btn btn-outline btn-sm">
              <ToolIcon name="flip-h" className="h-4 w-4 rotate-90" />
              Flip All Vertical
            </button>
            {hasAnyFlip && (
              <button type="button" onClick={resetAll} className="text-xs text-primary hover:underline">
                Reset all
              </button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {thumbnails.map((thumb, index) => {
              const flip = flips[index];
              return (
                <div
                  key={index}
                  className="flex flex-col items-center gap-2 rounded-lg border border-base-300 bg-base-200 p-2"
                >
                  <div className="flex h-36 w-36 items-center justify-center overflow-hidden">
                    <img
                      src={thumb}
                      alt={`Page ${index + 1}`}
                      className="max-h-full max-w-full object-contain shadow-sm transition-transform"
                      style={{
                        transform: `scaleX(${flip.horizontal ? -1 : 1}) scaleY(${flip.vertical ? -1 : 1})`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-base-content/60">Page {index + 1}</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => toggleFlip(index, "horizontal")}
                      className={`btn btn-xs btn-square ${flip.horizontal ? "btn-primary" : "btn-ghost"}`}
                      aria-label={`Flip page ${index + 1} horizontally`}
                      title="Flip horizontal"
                    >
                      <ToolIcon name="flip-h" className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFlip(index, "vertical")}
                      className={`btn btn-xs btn-square ${flip.vertical ? "btn-primary" : "btn-ghost"}`}
                      aria-label={`Flip page ${index + 1} vertically`}
                      title="Flip vertical"
                    >
                      <ToolIcon name="flip-h" className="h-3.5 w-3.5 rotate-90" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      <div className="mt-6">
        {status === "done" && downloadUrl ? (
          <a href={downloadUrl} download="flipped.pdf" className="btn btn-primary w-full">
            <ToolIcon name="download" className="h-4 w-4" />
            Download Flipped PDF
          </a>
        ) : (
          <button
            type="button"
            onClick={handleFlip}
            disabled={thumbnails.length === 0 || !hasAnyFlip || status === "working"}
            className="btn btn-primary w-full"
          >
            {status === "working" ? "Flipping..." : "Flip PDF"}
          </button>
        )}
      </div>
      {thumbnails.length > 0 && !hasAnyFlip && (
        <p className="mt-2 text-center text-xs text-base-content/50">
          Flip at least one page (or use Flip All) first.
        </p>
      )}
    </div>
  );
}
