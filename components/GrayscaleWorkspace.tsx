"use client";

import { useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { loadPdfjs } from "@/lib/pdfjs";
import { describeError } from "@/lib/errorHelpers";

type Status = "idle" | "working" | "done" | "error";
type QualityId = "standard" | "high" | "print";

const QUALITY_LEVELS: { id: QualityId; label: string; description: string; scale: number; jpegQuality: number }[] = [
  { id: "standard", label: "Standard", description: "Smaller file", scale: 1.5, jpegQuality: 0.85 },
  { id: "high", label: "High", description: "Good balance", scale: 2, jpegQuality: 0.92 },
  { id: "print", label: "Print", description: "Best quality", scale: 3, jpegQuality: 0.95 },
];

export function GrayscaleWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState<QualityId>("high");
  const [status, setStatus] = useState<Status>("idle");
  const [progressLabel, setProgressLabel] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  function resetOutput() {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setStatus("idle");
    setErrorMessage("");
  }

  function loadFile(selected: File) {
    resetOutput();
    setFile(selected);
  }

  async function handleGrayscale() {
    if (!file) return;
    setStatus("working");
    setErrorMessage("");

    try {
      const { scale, jpegQuality } = QUALITY_LEVELS.find((level) => level.id === quality)!;
      const [pdfjs, { PDFDocument }] = await Promise.all([loadPdfjs(), import("pdf-lib")]);
      const bytes = await file.arrayBuffer();
      const pdfjsDoc = await pdfjs.getDocument({ data: bytes.slice(0) }).promise;
      const outDoc = await PDFDocument.create();

      for (let pageNumber = 1; pageNumber <= pdfjsDoc.numPages; pageNumber++) {
        setProgressLabel(`Converting page ${pageNumber} of ${pdfjsDoc.numPages}...`);
        const page = await pdfjsDoc.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        // Desaturating the canvas before pdf.js paints onto it turns
        // everything it draws — text, vector shapes, and embedded images
        // alike — grayscale in one pass, rather than needing to separately
        // rewrite every color operator in the page's content stream and
        // re-encode every embedded image.
        ctx.filter = "grayscale(100%)";
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", jpegQuality));
        if (!blob) continue;
        const imageBytes = new Uint8Array(await blob.arrayBuffer());
        const image = await outDoc.embedJpg(imageBytes);

        const outPage = outDoc.addPage([baseViewport.width, baseViewport.height]);
        outPage.drawImage(image, { x: 0, y: 0, width: baseViewport.width, height: baseViewport.height });
      }

      const outBytes = await outDoc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("done");
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, error instanceof Error ? `Couldn't convert this PDF: ${error.message}` : "Couldn't convert this PDF to grayscale.",));
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
          <ToolIcon name="grayscale" className="h-4 w-4 text-secondary" />
          <span className="truncate text-base-content/80">{file.name}</span>
        </span>
        <button
          type="button"
          onClick={() => {
            setFile(null);
            resetOutput();
          }}
          className="text-xs text-base-content/50 hover:text-error"
        >
          Replace
        </button>
      </div>

      <div className="mt-5">
        <p className="text-sm font-medium text-base-content">Quality</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {QUALITY_LEVELS.map((level) => (
            <button
              key={level.id}
              type="button"
              onClick={() => {
                setQuality(level.id);
                resetOutput();
              }}
              className={`rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                quality === level.id
                  ? "border-primary bg-primary/5 text-base-content"
                  : "border-base-300 text-base-content/70 hover:border-primary/40"
              }`}
            >
              <span className="block font-medium">{level.label}</span>
              <span className="block text-xs text-base-content/50">{level.description}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-base-content/50">
          Each page is converted to a high-resolution grayscale image — text will no longer be selectable or
          searchable afterward.
        </p>
      </div>

      {status === "working" && (
        <p className="mt-4 text-center text-xs text-base-content/60">{progressLabel}</p>
      )}

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      <div className="mt-6">
        {status === "done" && downloadUrl ? (
          <a href={downloadUrl} download="grayscale.pdf" className="btn btn-primary w-full">
            <ToolIcon name="download" className="h-4 w-4" />
            Download Grayscale PDF
          </a>
        ) : (
          <button
            type="button"
            onClick={handleGrayscale}
            disabled={status === "working"}
            className="btn btn-primary w-full"
          >
            {status === "working" ? "Converting..." : "Convert to Grayscale"}
          </button>
        )}
      </div>
    </div>
  );
}
