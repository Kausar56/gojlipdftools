"use client";

import { useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { loadPdfjs } from "@/lib/pdfjs";
import { describeError } from "@/lib/errorHelpers";

type Status = "idle" | "rendering" | "rotating" | "done" | "error";

const THUMB_WIDTH = 200;

export function RotatePdfWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  // One thumbnail + one independent rotation delta per page, so each page can
  // be turned however the user wants instead of one angle for the whole file.
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [rotations, setRotations] = useState<number[]>([]);
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
    setRotations([]);
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
      setRotations(new Array(thumbs.length).fill(0));
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, "Couldn't read this file — make sure it's a valid PDF."));
    }
  }

  function turnPage(index: number, direction: -1 | 1) {
    setRotations((prev) => prev.map((rot, i) => (i === index ? (rot + direction * 90 + 360) % 360 : rot)));
    resetOutput();
  }

  function turnAll(direction: -1 | 1) {
    setRotations((prev) => prev.map((rot) => (rot + direction * 90 + 360) % 360));
    resetOutput();
  }

  function resetAll() {
    setRotations((prev) => prev.map(() => 0));
    resetOutput();
  }

  async function handleRotate() {
    if (!file || rotations.length === 0) return;
    setStatus("rotating");
    setErrorMessage("");

    try {
      const { PDFDocument, degrees } = await import("pdf-lib");
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);

      doc.getPages().forEach((page, index) => {
        const delta = rotations[index] ?? 0;
        if (delta === 0) return;
        const current = page.getRotation().angle;
        page.setRotation(degrees((current + delta) % 360));
      });

      const outBytes = await doc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("done");
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, error instanceof Error ? `Couldn't rotate this PDF: ${error.message}` : "Couldn't rotate this PDF.",));
    }
  }

  const hasAnyRotation = rotations.some((rot) => rot !== 0);

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
          <ToolIcon name="rotate-pdf" className="h-4 w-4 text-secondary" />
          <span className="truncate text-base-content/80">{file.name}</span>
          {thumbnails.length > 0 && <span className="badge badge-neutral badge-sm">{thumbnails.length} pages</span>}
        </span>
        <button
          type="button"
          onClick={() => {
            setFile(null);
            setThumbnails([]);
            setRotations([]);
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
            <button type="button" onClick={() => turnAll(-1)} className="btn btn-outline btn-sm">
              <ToolIcon name="undo" className="h-4 w-4" />
              Rotate All Left
            </button>
            <button type="button" onClick={() => turnAll(1)} className="btn btn-outline btn-sm">
              <ToolIcon name="redo" className="h-4 w-4" />
              Rotate All Right
            </button>
            {hasAnyRotation && (
              <button type="button" onClick={resetAll} className="text-xs text-primary hover:underline">
                Reset all
              </button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {thumbnails.map((thumb, index) => (
              <div
                key={index}
                className="flex flex-col items-center gap-2 rounded-lg border border-base-300 bg-base-200 p-2"
              >
                <div className="flex h-36 w-36 items-center justify-center overflow-hidden">
                  <img
                    src={thumb}
                    alt={`Page ${index + 1}`}
                    className="max-h-full max-w-full object-contain shadow-sm transition-transform"
                    style={{ transform: `rotate(${rotations[index]}deg)` }}
                  />
                </div>
                <span className="text-xs text-base-content/60">
                  Page {index + 1}
                  {rotations[index] !== 0 && <span className="ml-1 text-primary">({rotations[index]}°)</span>}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => turnPage(index, -1)}
                    className="btn btn-ghost btn-xs btn-square"
                    aria-label={`Rotate page ${index + 1} left`}
                    title="Rotate left"
                  >
                    <ToolIcon name="undo" className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => turnPage(index, 1)}
                    className="btn btn-ghost btn-xs btn-square"
                    aria-label={`Rotate page ${index + 1} right`}
                    title="Rotate right"
                  >
                    <ToolIcon name="redo" className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      <div className="mt-6">
        {status === "done" && downloadUrl ? (
          <a href={downloadUrl} download="rotated.pdf" className="btn btn-primary w-full">
            <ToolIcon name="download" className="h-4 w-4" />
            Download Rotated PDF
          </a>
        ) : (
          <button
            type="button"
            onClick={handleRotate}
            disabled={thumbnails.length === 0 || !hasAnyRotation || status === "rotating"}
            className="btn btn-primary w-full"
          >
            {status === "rotating" ? "Rotating..." : "Rotate PDF"}
          </button>
        )}
      </div>
      {thumbnails.length > 0 && !hasAnyRotation && (
        <p className="mt-2 text-center text-xs text-base-content/50">
          Rotate a page (or use Rotate All) to set an angle first.
        </p>
      )}
    </div>
  );
}
