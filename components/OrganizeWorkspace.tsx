"use client";

import { useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { loadPdfjs } from "@/lib/pdfjs";
import { describeError } from "@/lib/errorHelpers";

type Status = "idle" | "rendering" | "working" | "done" | "error";

type PageItem = {
  id: string;
  sourceIndex: number;
  rotation: number;
  thumbnail: string;
};

const THUMB_HEIGHT_PX = 160;

export function OrganizeWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
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
    setPages([]);
    setStatus("rendering");

    try {
      const pdfjs = await loadPdfjs();
      const bytes = await selected.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: bytes }).promise;
      const nextPages: PageItem[] = [];

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
        nextPages.push({
          id: `page-${pageNumber - 1}`,
          sourceIndex: pageNumber - 1,
          rotation: 0,
          thumbnail: canvas.toDataURL("image/jpeg", 0.8),
        });
      }

      setPages(nextPages);
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, "Couldn't read this file — make sure it's a valid PDF."));
    }
  }

  function turnPage(id: string, direction: -1 | 1) {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, rotation: (p.rotation + direction * 90 + 360) % 360 } : p)),
    );
    resetOutput();
  }

  function deletePage(id: string) {
    setPages((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));
    resetOutput();
  }

  // Drag-to-reorder via Pointer Events (not native HTML5 drag-and-drop, which
  // has no touch support at all) — hit-tests the pointer position against
  // every other card's live bounding rect to find what it's currently over.
  function startDrag(id: string, event: React.PointerEvent) {
    event.preventDefault();
    setDraggingId(id);

    function onMove(moveEvent: PointerEvent) {
      let overId: string | null = null;
      for (const [otherId, el] of cardRefs.current.entries()) {
        const rect = el.getBoundingClientRect();
        if (
          moveEvent.clientX >= rect.left &&
          moveEvent.clientX <= rect.right &&
          moveEvent.clientY >= rect.top &&
          moveEvent.clientY <= rect.bottom
        ) {
          overId = otherId;
          break;
        }
      }
      if (!overId || overId === id) return;

      setPages((prev) => {
        const currentIndex = prev.findIndex((p) => p.id === id);
        const targetIndex = prev.findIndex((p) => p.id === overId);
        if (currentIndex === -1 || targetIndex === -1 || currentIndex === targetIndex) return prev;
        const next = [...prev];
        const [item] = next.splice(currentIndex, 1);
        next.splice(targetIndex, 0, item);
        return next;
      });
    }

    function onUp() {
      setDraggingId(null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    resetOutput();
  }

  async function handleSave() {
    if (!file || pages.length === 0) return;
    setStatus("working");
    setErrorMessage("");

    try {
      const { PDFDocument, degrees } = await import("pdf-lib");
      const bytes = await file.arrayBuffer();
      const sourceDoc = await PDFDocument.load(bytes);
      const outDoc = await PDFDocument.create();

      const copiedPages = await outDoc.copyPages(sourceDoc, pages.map((p) => p.sourceIndex));
      pages.forEach((p, index) => {
        const page = copiedPages[index];
        if (p.rotation !== 0) {
          const current = page.getRotation().angle;
          page.setRotation(degrees((current + p.rotation) % 360));
        }
        outDoc.addPage(page);
      });

      const outBytes = await outDoc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("done");
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, error instanceof Error ? `Couldn't organize this PDF: ${error.message}` : "Couldn't organize this PDF.",));
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
          <ToolIcon name="merge" className="h-4 w-4 text-primary" />
          <span className="truncate text-base-content/80">{file.name}</span>
          {pages.length > 0 && <span className="badge badge-neutral badge-sm">{pages.length} pages</span>}
        </span>
        <button
          type="button"
          onClick={() => {
            setFile(null);
            setPages([]);
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

      {pages.length > 0 && (
        <>
          <p className="mt-5 text-xs text-base-content/50">
            Drag a page by its grip handle to reorder, rotate it, or delete it — then save.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {pages.map((page, index) => (
              <div
                key={page.id}
                ref={(el) => {
                  if (el) cardRefs.current.set(page.id, el);
                  else cardRefs.current.delete(page.id);
                }}
                className={`flex flex-col items-center gap-2 rounded-lg border bg-base-200 p-2 transition ${
                  draggingId === page.id ? "border-primary shadow-lg ring-2 ring-primary/40" : "border-base-300"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span
                    onPointerDown={(event) => startDrag(page.id, event)}
                    style={{ touchAction: "none" }}
                    className="cursor-grab text-base-content/40 hover:text-base-content/70 active:cursor-grabbing"
                    aria-label="Drag to reorder"
                    title="Drag to reorder"
                  >
                    <ToolIcon name="grip" className="h-4 w-4" />
                  </span>
                  <span className="text-xs text-base-content/60">{index + 1}</span>
                  <button
                    type="button"
                    onClick={() => deletePage(page.id)}
                    disabled={pages.length <= 1}
                    className="btn btn-ghost btn-xs btn-square text-error disabled:opacity-30"
                    aria-label={`Delete page ${index + 1}`}
                    title="Delete page"
                  >
                    <ToolIcon name="close" className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex h-36 w-36 items-center justify-center overflow-hidden">
                  <img
                    src={page.thumbnail}
                    alt={`Page ${index + 1}`}
                    className="max-h-full max-w-full object-contain shadow-sm transition-transform"
                    style={{ transform: `rotate(${page.rotation}deg)` }}
                  />
                </div>

                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => turnPage(page.id, -1)}
                    className="btn btn-ghost btn-xs btn-square"
                    aria-label={`Rotate page ${index + 1} left`}
                    title="Rotate left"
                  >
                    <ToolIcon name="undo" className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => turnPage(page.id, 1)}
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
          <a href={downloadUrl} download="organized.pdf" className="btn btn-primary w-full">
            <ToolIcon name="download" className="h-4 w-4" />
            Download Organized PDF
          </a>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            disabled={pages.length === 0 || status === "working" || status === "rendering"}
            className="btn btn-primary w-full"
          >
            {status === "working" ? "Saving..." : "Save Organized PDF"}
          </button>
        )}
      </div>
    </div>
  );
}
