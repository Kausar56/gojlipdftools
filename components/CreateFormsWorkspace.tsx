"use client";

import { useEffect, useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { SaveSuccessModal } from "./SaveSuccessModal";
import { loadPdfjs } from "@/lib/pdfjs";
import { describeError } from "@/lib/errorHelpers";

type Status = "idle" | "working" | "done" | "error";
type FieldType = "text" | "checkbox" | "signature";

// Top-left origin (not centered like Fill & Sign's stamps) — a form field's
// position and size are both meaningful, so it's simplest to work in the
// same x/y/width/height shape pdf-lib's addToPage itself expects.
type FieldElement = {
  id: string;
  pageIndex: number;
  type: FieldType;
  name: string;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
};

const PREVIEW_WIDTH_PX = 480;
const DEFAULT_SIZE: Record<FieldType, { widthPct: number; heightPct: number }> = {
  text: { widthPct: 0.28, heightPct: 0.035 },
  checkbox: { widthPct: 0.03, heightPct: 0.03 },
  signature: { widthPct: 0.32, heightPct: 0.05 },
};
const FIELD_LABELS: Record<FieldType, string> = {
  text: "Text Field",
  checkbox: "Checkbox",
  signature: "Signature Field",
};

const STAGGER_STEPS = [
  { x: 0.1, y: 0.1 },
  { x: 0.1, y: 0.25 },
  { x: 0.1, y: 0.4 },
  { x: 0.1, y: 0.55 },
  { x: 0.1, y: 0.7 },
];

function createId() {
  return `field-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function CreateFormsWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [elements, setElements] = useState<FieldElement[]>([]);
  const [addCount, setAddCount] = useState(0);
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
        // Preview render failed — fields can still be added by field-name/position.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, pageCount, currentPageIndex]);

  const currentPageElements = elements.filter((el) => el.pageIndex === currentPageIndex);
  const typeCounts: Record<FieldType, number> = { text: 0, checkbox: 0, signature: 0 };
  elements.forEach((el) => typeCounts[el.type]++);

  function addField(type: FieldType) {
    const spot = STAGGER_STEPS[addCount % STAGGER_STEPS.length];
    setAddCount((c) => c + 1);
    const id = createId();
    const size = DEFAULT_SIZE[type];
    setElements((prev) => [
      ...prev,
      {
        id,
        pageIndex: currentPageIndex,
        type,
        name: `${type}_${typeCounts[type] + 1}`,
        xPct: spot.x,
        yPct: spot.y,
        widthPct: size.widthPct,
        heightPct: size.heightPct,
      },
    ]);
    resetOutput();
  }

  function updateElement(id: string, patch: Partial<FieldElement>) {
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, ...patch } : el)));
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
    const el = elements.find((item) => item.id === id);
    if (!el) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const start = { x: el.xPct, y: el.yPct };
    const elWidthPct = el.widthPct;
    const elHeightPct = el.heightPct;

    function onMove(moveEvent: PointerEvent) {
      const dx = (moveEvent.clientX - startX) / rect.width;
      const dy = (moveEvent.clientY - startY) / rect.height;
      updateElement(id, {
        xPct: Math.min(1 - elWidthPct, Math.max(0, start.x + dx)),
        yPct: Math.min(1 - elHeightPct, Math.max(0, start.y + dy)),
      });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function startResize(id: string, event: React.PointerEvent) {
    event.stopPropagation();
    const box = previewBoxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const el = elements.find((item) => item.id === id);
    if (!el) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const start = { width: el.widthPct, height: el.heightPct };
    const elXPct = el.xPct;
    const elYPct = el.yPct;

    function onMove(moveEvent: PointerEvent) {
      const dx = (moveEvent.clientX - startX) / rect.width;
      const dy = (moveEvent.clientY - startY) / rect.height;
      updateElement(id, {
        widthPct: Math.max(0.03, Math.min(1 - elXPct, start.width + dx)),
        heightPct: Math.max(0.02, Math.min(1 - elYPct, start.height + dy)),
      });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  async function handleSave() {
    if (!file || elements.length === 0) return;
    setStatus("working");
    setErrorMessage("");

    try {
      const { PDFDocument } = await import("pdf-lib");
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const form = doc.getForm();
      const pages = doc.getPages();
      const usedNames = new Set<string>();

      elements.forEach((el, index) => {
        const page = pages[el.pageIndex];
        if (!page) return;
        const { width: pageWidth, height: pageHeight } = page.getSize();

        let name = el.name.trim() || `${el.type}_${index + 1}`;
        while (usedNames.has(name)) name = `${name}_${index + 1}`;
        usedNames.add(name);

        if (el.type === "checkbox") {
          const sizePt = el.widthPct * pageWidth;
          const xPt = el.xPct * pageWidth;
          const yPt = pageHeight - el.yPct * pageHeight - sizePt;
          const field = form.createCheckBox(name);
          field.addToPage(page, { x: xPt, y: yPt, width: sizePt, height: sizePt, borderWidth: 1 });
        } else {
          const wPt = el.widthPct * pageWidth;
          const hPt = el.heightPct * pageHeight;
          const xPt = el.xPct * pageWidth;
          const yPt = pageHeight - el.yPct * pageHeight - hPt;
          const field = form.createTextField(name);
          field.addToPage(page, { x: xPt, y: yPt, width: wPt, height: hPt, borderWidth: 1 });
        }
      });

      const outBytes = await doc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("done");
      setShowSuccessModal(true);
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, error instanceof Error ? `Couldn't create the form: ${error.message}` : "Couldn't create the form.",));
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
          downloadFileName="form.pdf"
          onClose={() => setShowSuccessModal(false)}
        />
      )}

      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 truncate">
          <ToolIcon name="checkbox" className="h-4 w-4 text-primary" />
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
        <button type="button" onClick={() => addField("text")} className="btn btn-outline btn-sm">
          <ToolIcon name="cursor" className="h-4 w-4" />
          Add Text Field
        </button>
        <button type="button" onClick={() => addField("checkbox")} className="btn btn-outline btn-sm">
          <ToolIcon name="checkbox" className="h-4 w-4" />
          Add Checkbox
        </button>
        <button type="button" onClick={() => addField("signature")} className="btn btn-outline btn-sm">
          <ToolIcon name="signature" className="h-4 w-4" />
          Add Signature Field
        </button>
      </div>
      <p className="mt-2 text-xs text-base-content/50">
        Signature Field adds a text box labeled for a typed signature — pdf-lib can't create a real
        cryptographic signature field, so this is the closest a static PDF form field can get.
      </p>

      <div className="mt-5 flex flex-col items-center gap-2">
        <div
          ref={previewBoxRef}
          className="relative select-none overflow-hidden rounded-sm border border-base-300 bg-base-200 shadow-sm"
        >
          <canvas ref={previewCanvasRef} className="block max-w-full" />

          {currentPageElements.map((el) => (
            <div
              key={el.id}
              className="absolute flex flex-col rounded border-2 border-dashed border-primary bg-primary/10"
              style={{
                left: `${el.xPct * 100}%`,
                top: `${el.yPct * 100}%`,
                width: `${el.widthPct * 100}%`,
                height: `${el.heightPct * 100}%`,
              }}
            >
              <div className="flex items-center justify-between gap-1 bg-primary px-1 text-[10px] text-primary-content">
                <span
                  onPointerDown={(event) => startDrag(el.id, event)}
                  style={{ touchAction: "none" }}
                  className="cursor-grab truncate active:cursor-grabbing"
                  title="Drag to move"
                >
                  {FIELD_LABELS[el.type]}
                </span>
                <button
                  type="button"
                  onClick={() => deleteElement(el.id)}
                  className="shrink-0"
                  aria-label="Delete field"
                >
                  <ToolIcon name="close" className="h-2.5 w-2.5" />
                </button>
              </div>
              {el.type !== "checkbox" && (
                <div
                  onPointerDown={(event) => startResize(el.id, event)}
                  style={{ touchAction: "none" }}
                  className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-sm border border-white bg-primary"
                />
              )}
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

      {currentPageElements.length > 0 && (
        <div className="mt-5 space-y-2">
          <p className="text-sm font-medium text-base-content">Fields on this page</p>
          {currentPageElements.map((el) => (
            <div key={el.id} className="flex items-center gap-2 rounded-lg border border-base-300 px-3 py-2 text-sm">
              <span className="badge badge-neutral badge-sm shrink-0">{FIELD_LABELS[el.type]}</span>
              <input
                type="text"
                value={el.name}
                onChange={(event) => updateElement(el.id, { name: event.target.value })}
                placeholder="Field name"
                className="input input-bordered input-xs flex-1"
              />
            </div>
          ))}
        </div>
      )}

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      <div className="mt-6">
        {status === "done" && downloadUrl ? (
          <a href={downloadUrl} download="form.pdf" className="btn btn-primary w-full">
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
            {status === "working" ? "Creating form..." : "Create Form"}
          </button>
        )}
      </div>
    </div>
  );
}
