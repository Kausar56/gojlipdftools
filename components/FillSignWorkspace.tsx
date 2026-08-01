"use client";

import { useEffect, useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { SignaturePad } from "./SignaturePad";
import { loadPdfjs } from "@/lib/pdfjs";
import { describeError } from "@/lib/errorHelpers";

type Status = "idle" | "working" | "done" | "error";

type BaseElement = { id: string; pageIndex: number; xPct: number; yPct: number };
type TextElement = BaseElement & { type: "text"; text: string; fontSizePt: number };
type CheckmarkElement = BaseElement & { type: "checkmark"; sizePt: number };
type SignatureElement = BaseElement & { type: "signature"; dataUrl: string; widthPt: number; aspectRatio: number };
type FillElement = TextElement | CheckmarkElement | SignatureElement;

const PREVIEW_WIDTH_PX = 480;
// Staggers where a newly added element lands so repeatedly clicking "Add
// Text" doesn't pile every one exactly on top of the last.
const STAGGER_STEPS = [
  { x: 0.5, y: 0.5 },
  { x: 0.35, y: 0.4 },
  { x: 0.65, y: 0.4 },
  { x: 0.35, y: 0.6 },
  { x: 0.65, y: 0.6 },
];

function createElementId() {
  return `el-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function FillSignWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pageSizePt, setPageSizePt] = useState<{ width: number; height: number } | null>(null);
  const [elements, setElements] = useState<FillElement[]>([]);
  const [addCount, setAddCount] = useState(0);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  // Drawing a signature is the slow part — cache it so "Add Signature" after
  // the first time just stamps another copy instead of reopening the pad.
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
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
    setPageCount(null);
    setCurrentPageIndex(0);
    setElements([]);
    setAddCount(0);
    try {
      const pdfjs = await loadPdfjs();
      const doc = await pdfjs.getDocument({ data: await selected.arrayBuffer() }).promise;
      setPageCount(doc.numPages);
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, "Couldn't read this file — make sure it's a valid PDF."));
    }
  }

  // Renders whichever page is currently selected for filling.
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
        const scale = PREVIEW_WIDTH_PX / baseViewport.width;
        const viewport = page.getViewport({ scale });
        const canvas = previewCanvasRef.current;
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

  const previewScale = pageSizePt ? PREVIEW_WIDTH_PX / pageSizePt.width : 1;
  const currentPageElements = elements.filter((el) => el.pageIndex === currentPageIndex);

  function nextStagger() {
    const spot = STAGGER_STEPS[addCount % STAGGER_STEPS.length];
    setAddCount((c) => c + 1);
    return spot;
  }

  function addText(prefill = "Click to edit") {
    const spot = nextStagger();
    const id = createElementId();
    setElements((prev) => [
      ...prev,
      { id, pageIndex: currentPageIndex, xPct: spot.x, yPct: spot.y, type: "text", text: prefill, fontSizePt: 14 },
    ]);
    resetOutput();
  }

  function addDate() {
    addText(new Date().toLocaleDateString());
  }

  function addCheckmark() {
    const spot = nextStagger();
    const id = createElementId();
    setElements((prev) => [
      ...prev,
      { id, pageIndex: currentPageIndex, xPct: spot.x, yPct: spot.y, type: "checkmark", sizePt: 24 },
    ]);
    resetOutput();
  }

  function placeSignature(dataUrl: string) {
    const img = new window.Image();
    img.onload = () => {
      const spot = nextStagger();
      const id = createElementId();
      setElements((prev) => [
        ...prev,
        {
          id,
          pageIndex: currentPageIndex,
          xPct: spot.x,
          yPct: spot.y,
          type: "signature",
          dataUrl,
          widthPt: 140,
          aspectRatio: img.naturalHeight / img.naturalWidth || 0.4,
        },
      ]);
      resetOutput();
    };
    img.src = dataUrl;
  }

  function handleSignatureConfirm(dataUrl: string) {
    setShowSignaturePad(false);
    setSavedSignature(dataUrl);
    placeSignature(dataUrl);
  }

  function handleAddSignatureClick() {
    if (savedSignature) {
      placeSignature(savedSignature);
    } else {
      setShowSignaturePad(true);
    }
  }

  function updateElement(id: string, patch: Partial<FillElement>) {
    setElements((prev) => prev.map((el) => (el.id === id ? ({ ...el, ...patch } as FillElement) : el)));
    resetOutput();
  }

  function deleteElement(id: string) {
    setElements((prev) => prev.filter((el) => el.id !== id));
    resetOutput();
  }

  function startDrag(id: string, event: React.PointerEvent) {
    event.stopPropagation();
    const box = previewBoxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();

    function onMove(moveEvent: PointerEvent) {
      const x = (moveEvent.clientX - rect.left) / rect.width;
      const y = (moveEvent.clientY - rect.top) / rect.height;
      updateElement(id, { xPct: Math.min(1, Math.max(0, x)), yPct: Math.min(1, Math.max(0, y)) });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  async function handleSave() {
    if (!file) return;
    setStatus("working");
    setErrorMessage("");

    try {
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const imageCache = new Map<string, Awaited<ReturnType<typeof doc.embedPng>>>();

      const pages = doc.getPages();
      for (const el of elements) {
        const page = pages[el.pageIndex];
        if (!page) continue;
        const { width: pageWidth, height: pageHeight } = page.getSize();
        const cx = el.xPct * pageWidth;
        const cy = pageHeight - el.yPct * pageHeight;

        if (el.type === "text") {
          if (!el.text.trim()) continue;
          const textWidth = font.widthOfTextAtSize(el.text, el.fontSizePt);
          page.drawText(el.text, {
            x: cx - textWidth / 2,
            y: cy - el.fontSizePt / 2,
            size: el.fontSizePt,
            font,
            color: rgb(0, 0, 0),
          });
        } else if (el.type === "checkmark") {
          const s = el.sizePt;
          const thickness = Math.max(1.5, s * 0.12);
          page.drawLine({
            start: { x: cx - s * 0.35, y: cy },
            end: { x: cx - s * 0.05, y: cy - s * 0.35 },
            thickness,
            color: rgb(0, 0, 0),
          });
          page.drawLine({
            start: { x: cx - s * 0.05, y: cy - s * 0.35 },
            end: { x: cx + s * 0.35, y: cy + s * 0.25 },
            thickness,
            color: rgb(0, 0, 0),
          });
        } else if (el.type === "signature") {
          let image = imageCache.get(el.dataUrl);
          if (!image) {
            const buf = await (await fetch(el.dataUrl)).arrayBuffer();
            image = await doc.embedPng(buf);
            imageCache.set(el.dataUrl, image);
          }
          const width = el.widthPt;
          const height = width * el.aspectRatio;
          page.drawImage(image, { x: cx - width / 2, y: cy - height / 2, width, height });
        }
      }

      const outBytes = await doc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("done");
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, error instanceof Error ? `Couldn't save this PDF: ${error.message}` : "Couldn't save this PDF.",));
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
      {showSignaturePad && (
        <SignaturePad onConfirm={handleSignatureConfirm} onCancel={() => setShowSignaturePad(false)} />
      )}

      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 truncate">
          <ToolIcon name="signature" className="h-4 w-4 text-primary" />
          <span className="truncate text-base-content/80">{file.name}</span>
          {pageCount && <span className="badge badge-neutral badge-sm">{pageCount} pages</span>}
        </span>
        <button
          type="button"
          onClick={() => {
            setFile(null);
            setPageCount(null);
            setElements([]);
            resetOutput();
          }}
          className="text-xs text-base-content/50 hover:text-error"
        >
          Replace
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={() => addText()} className="btn btn-outline btn-sm">
          <ToolIcon name="cursor" className="h-4 w-4" />
          Add Text
        </button>
        <button type="button" onClick={addDate} className="btn btn-outline btn-sm">
          <ToolIcon name="cursor" className="h-4 w-4" />
          Add Date
        </button>
        <button type="button" onClick={addCheckmark} className="btn btn-outline btn-sm">
          <ToolIcon name="check" className="h-4 w-4" />
          Add Checkmark
        </button>
        <button type="button" onClick={handleAddSignatureClick} className="btn btn-outline btn-sm">
          <ToolIcon name="signature" className="h-4 w-4" />
          Add Signature
        </button>
        {savedSignature && (
          <button
            type="button"
            onClick={() => setShowSignaturePad(true)}
            className="text-xs text-primary hover:underline"
          >
            Redraw signature
          </button>
        )}
      </div>

      <div className="mt-5 flex flex-col items-center gap-2">
        <div
          ref={previewBoxRef}
          className="relative select-none overflow-hidden rounded-sm border border-base-300 bg-base-200 shadow-sm"
        >
          <canvas ref={previewCanvasRef} className="block max-w-full" />

          {currentPageElements.map((el) => (
            <div
              key={el.id}
              className="absolute flex items-center gap-1 rounded border border-primary/40 bg-base-100/95 px-1 py-0.5 shadow-sm"
              style={{ left: `${el.xPct * 100}%`, top: `${el.yPct * 100}%`, transform: "translate(-50%, -50%)" }}
            >
              <span
                onPointerDown={(event) => startDrag(el.id, event)}
                style={{ touchAction: "none" }}
                className="cursor-grab text-base-content/40 hover:text-base-content/70 active:cursor-grabbing"
                aria-label="Drag to move"
                title="Drag to move"
              >
                <ToolIcon name="grip" className="h-3.5 w-3.5" />
              </span>

              {el.type === "text" && (
                <>
                  <input
                    type="text"
                    value={el.text}
                    onChange={(event) => updateElement(el.id, { text: event.target.value })}
                    style={{ fontSize: Math.max(8, el.fontSizePt * previewScale) }}
                    className="min-w-0 border-none bg-transparent p-0 outline-none"
                    size={Math.max(4, el.text.length)}
                  />
                  <button
                    type="button"
                    onClick={() => updateElement(el.id, { fontSizePt: Math.max(6, el.fontSizePt - 2) })}
                    className="btn btn-ghost btn-xs btn-square"
                    aria-label="Smaller text"
                  >
                    <ToolIcon name="minus" className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateElement(el.id, { fontSizePt: Math.min(72, el.fontSizePt + 2) })}
                    className="btn btn-ghost btn-xs btn-square"
                    aria-label="Bigger text"
                  >
                    <ToolIcon name="plus" className="h-3 w-3" />
                  </button>
                </>
              )}

              {el.type === "checkmark" && (
                <>
                  <span
                    className="inline-block text-primary"
                    style={{ width: el.sizePt * previewScale, height: el.sizePt * previewScale }}
                  >
                    <ToolIcon name="check" className="h-full w-full" />
                  </span>
                  <button
                    type="button"
                    onClick={() => updateElement(el.id, { sizePt: Math.max(10, el.sizePt - 4) })}
                    className="btn btn-ghost btn-xs btn-square"
                    aria-label="Smaller checkmark"
                  >
                    <ToolIcon name="minus" className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateElement(el.id, { sizePt: Math.min(72, el.sizePt + 4) })}
                    className="btn btn-ghost btn-xs btn-square"
                    aria-label="Bigger checkmark"
                  >
                    <ToolIcon name="plus" className="h-3 w-3" />
                  </button>
                </>
              )}

              {el.type === "signature" && (
                <>
                  <img
                    src={el.dataUrl}
                    alt="Signature"
                    draggable={false}
                    style={{ width: el.widthPt * previewScale, height: el.widthPt * el.aspectRatio * previewScale }}
                  />
                  <button
                    type="button"
                    onClick={() => updateElement(el.id, { widthPt: Math.max(40, el.widthPt - 20) })}
                    className="btn btn-ghost btn-xs btn-square"
                    aria-label="Smaller signature"
                  >
                    <ToolIcon name="minus" className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateElement(el.id, { widthPt: Math.min(320, el.widthPt + 20) })}
                    className="btn btn-ghost btn-xs btn-square"
                    aria-label="Bigger signature"
                  >
                    <ToolIcon name="plus" className="h-3 w-3" />
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => deleteElement(el.id)}
                className="btn btn-ghost btn-xs btn-square text-error"
                aria-label="Delete"
              >
                <ToolIcon name="close" className="h-3 w-3" />
              </button>
            </div>
          ))}
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
              {elements.some((el) => el.pageIndex === currentPageIndex) && (
                <span className="ml-1 text-primary">(has fields)</span>
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
      </div>

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      <div className="mt-6">
        {status === "done" && downloadUrl ? (
          <a href={downloadUrl} download="filled-and-signed.pdf" className="btn btn-primary w-full">
            <ToolIcon name="download" className="h-4 w-4" />
            Download PDF
          </a>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            disabled={elements.length === 0 || status === "working"}
            className="btn btn-primary w-full"
          >
            {status === "working" ? "Saving..." : "Save PDF"}
          </button>
        )}
      </div>
    </div>
  );
}
