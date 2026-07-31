"use client";

import { useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { loadPdfjs } from "@/lib/pdfjs";
import { describeError } from "@/lib/errorHelpers";

type Status = "idle" | "rendering" | "working" | "done" | "error";
type PresetId = "a4" | "letter" | "legal" | "custom";
type PageTarget = { preset: PresetId; customWidth: string; customHeight: string };

const PRESETS: { id: PresetId; label: string; widthPt: number; heightPt: number }[] = [
  { id: "a4", label: "A4", widthPt: 595.28, heightPt: 841.89 },
  { id: "letter", label: "Letter", widthPt: 612, heightPt: 792 },
  { id: "legal", label: "Legal", widthPt: 612, heightPt: 1008 },
  { id: "custom", label: "Custom", widthPt: 0, heightPt: 0 },
];

const THUMB_HEIGHT_PX = 160;

function targetSize(target: PageTarget): { width: number; height: number } {
  if (target.preset === "custom") {
    return { width: Number(target.customWidth) || 0, height: Number(target.customHeight) || 0 };
  }
  const preset = PRESETS.find((p) => p.id === target.preset)!;
  return { width: preset.widthPt, height: preset.heightPt };
}

export function ResizePdfWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  // One thumbnail + one independently-configurable target size per page, so
  // a multi-page document (which can genuinely have mixed page sizes) can be
  // resized page by page instead of forcing every page to the same size.
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [pageSizes, setPageSizes] = useState<{ width: number; height: number }[]>([]);
  const [pageTargets, setPageTargets] = useState<PageTarget[]>([]);
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
    setPageSizes([]);
    setPageTargets([]);
    setStatus("rendering");

    try {
      const pdfjs = await loadPdfjs();
      const bytes = await selected.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: bytes }).promise;
      const thumbs: string[] = [];
      const sizes: { width: number; height: number }[] = [];

      for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
        const page = await doc.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: THUMB_HEIGHT_PX / baseViewport.height });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        thumbs.push(canvas.toDataURL("image/jpeg", 0.8));
        sizes.push({ width: baseViewport.width, height: baseViewport.height });
      }

      setThumbnails(thumbs);
      setPageSizes(sizes);
      // Defaults to each page's own current size ("custom", prefilled) — so
      // nothing actually changes for a page until the user picks a different
      // preset or size for it specifically.
      setPageTargets(
        sizes.map((size) => ({
          preset: "custom" as PresetId,
          customWidth: String(Math.round(size.width)),
          customHeight: String(Math.round(size.height)),
        })),
      );
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, "Couldn't read this file — make sure it's a valid PDF."));
    }
  }

  function updatePageTarget(index: number, patch: Partial<PageTarget>) {
    setPageTargets((prev) => prev.map((target, i) => (i === index ? { ...target, ...patch } : target)));
    resetOutput();
  }

  function applyPresetToAll(preset: PresetId) {
    setPageTargets((prev) => prev.map((target) => ({ ...target, preset })));
    resetOutput();
  }

  async function handleResize() {
    if (!file || pageTargets.length === 0) return;

    for (let i = 0; i < pageTargets.length; i++) {
      const { width, height } = targetSize(pageTargets[i]);
      if (!width || !height || width <= 0 || height <= 0) {
        setStatus("error");
        setErrorMessage(`Page ${i + 1} has an invalid target size — enter a valid width and height (in points).`);
        return;
      }
    }

    setStatus("working");
    setErrorMessage("");

    try {
      const { PDFDocument } = await import("pdf-lib");
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);

      // page.scale() resizes the page's MediaBox and scales its existing
      // content to match in one step, so nothing gets clipped or repositioned.
      doc.getPages().forEach((page, index) => {
        const target = pageTargets[index];
        if (!target) return;
        const { width: targetWidth, height: targetHeight } = targetSize(target);
        const { width, height } = page.getSize();
        page.scale(targetWidth / width, targetHeight / height);
      });

      const outBytes = await doc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("done");
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, error instanceof Error ? `Couldn't resize this PDF: ${error.message}` : "Couldn't resize this PDF.",));
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
          <ToolIcon name="shape-rect" className="h-4 w-4 text-primary" />
          <span className="truncate text-base-content/80">{file.name}</span>
          {thumbnails.length > 0 && <span className="badge badge-neutral badge-sm">{thumbnails.length} pages</span>}
        </span>
        <button
          type="button"
          onClick={() => {
            setFile(null);
            setThumbnails([]);
            setPageSizes([]);
            setPageTargets([]);
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
            <span className="text-xs text-base-content/50">Apply to all pages:</span>
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPresetToAll(p.id)}
                className="btn btn-outline btn-xs"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {thumbnails.map((thumb, index) => {
              const current = pageSizes[index];
              const target = pageTargets[index];
              if (!current || !target) return null;
              const { width: targetWidth, height: targetHeight } = targetSize(target);
              const hasValidTarget = targetWidth > 0 && targetHeight > 0;

              return (
                <div key={index} className="flex flex-col gap-2 rounded-lg border border-base-300 bg-base-200 p-3">
                  <div className="flex items-center justify-between text-xs text-base-content/60">
                    <span>Page {index + 1}</span>
                    <span>
                      {Math.round(current.width)} × {Math.round(current.height)} pt
                    </span>
                  </div>

                  <div className="flex justify-center">
                    <div
                      className="overflow-hidden rounded-sm border border-base-300 bg-base-100 shadow-sm"
                      style={{
                        height: THUMB_HEIGHT_PX,
                        width: hasValidTarget ? THUMB_HEIGHT_PX * (targetWidth / targetHeight) : THUMB_HEIGHT_PX * 0.75,
                      }}
                    >
                      {hasValidTarget && (
                        // object-fill (not object-contain) — page.scale() stretches
                        // the content non-uniformly to exactly fill the new page
                        // size, so this mirrors that distortion instead of hiding it.
                        <img
                          src={thumb}
                          alt={`Page ${index + 1} after resize`}
                          className="h-full w-full object-fill"
                        />
                      )}
                    </div>
                  </div>

                  <select
                    value={target.preset}
                    onChange={(event) => updatePageTarget(index, { preset: event.target.value as PresetId })}
                    className="select select-bordered select-xs w-full"
                  >
                    {PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>

                  {target.preset === "custom" && (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={target.customWidth}
                        onChange={(event) => updatePageTarget(index, { customWidth: event.target.value })}
                        placeholder="Width"
                        className="input input-bordered input-xs w-full"
                      />
                      <span className="text-xs text-base-content/40">×</span>
                      <input
                        type="number"
                        value={target.customHeight}
                        onChange={(event) => updatePageTarget(index, { customHeight: event.target.value })}
                        placeholder="Height"
                        className="input input-bordered input-xs w-full"
                      />
                      <span className="text-xs text-base-content/40">pt</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      <div className="mt-5">
        {status === "done" && downloadUrl ? (
          <a href={downloadUrl} download="resized.pdf" className="btn btn-primary w-full">
            <ToolIcon name="download" className="h-4 w-4" />
            Download PDF
          </a>
        ) : (
          <button
            type="button"
            onClick={handleResize}
            disabled={thumbnails.length === 0 || status === "working" || status === "rendering"}
            className="btn btn-primary w-full"
          >
            {status === "working" ? "Resizing..." : "Resize PDF"}
          </button>
        )}
      </div>
    </div>
  );
}
