"use client";

import { useEffect, useRef, useState } from "react";
import { loadPdfjs } from "@/lib/pdfjs";

export type PositionPct = { x: number; y: number };

const PREVIEW_WIDTH_PX = 420;

/**
 * Renders a PDF's first page and lets the user click or drag on it to choose
 * a position (returned as a 0-1 fraction, top-left origin, so it applies
 * proportionally across pages of different sizes) — shared between any tool
 * that stamps something at a caller-chosen spot (page numbers, Bates
 * numbering, headers/footers, ...) instead of a plain corner dropdown.
 */
export function PagePreviewPicker({
  file,
  positionPct,
  onPositionChange,
  marker,
}: {
  file: File;
  positionPct: PositionPct;
  onPositionChange: (pct: PositionPct) => void;
  /** Render-prop instead of a plain node — receives the preview's pt-to-px
   *  scale so a marker showing real PDF text (e.g. at a given font size) can
   *  size itself to match what will actually end up on the page, rather than
   *  a fixed CSS size that never visually reflects a font-size setting. */
  marker: (scale: number) => React.ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [pageSizePt, setPageSizePt] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPageSizePt(null);
    (async () => {
      try {
        const pdfjs = await loadPdfjs();
        const bytes = await file.arrayBuffer();
        const doc = await pdfjs.getDocument({ data: bytes }).promise;
        const page = await doc.getPage(1);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = PREVIEW_WIDTH_PX / baseViewport.width;
        const viewport = page.getViewport({ scale });
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
        // Preview render failed (e.g. an unusual PDF structure) — the tool
        // itself still works with whatever position was last chosen, just
        // without a live preview to click/drag on.
        if (!cancelled) setPageSizePt(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file]);

  function updateFromClient(clientX: number, clientY: number, rect: DOMRect) {
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    onPositionChange({ x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) });
  }

  function handlePointerDown(event: React.PointerEvent) {
    if (!pageSizePt) return;
    const box = boxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    updateFromClient(event.clientX, event.clientY, rect);

    function onMove(moveEvent: PointerEvent) {
      updateFromClient(moveEvent.clientX, moveEvent.clientY, rect);
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        ref={boxRef}
        onPointerDown={handlePointerDown}
        style={{ touchAction: "none" }}
        className={`relative select-none overflow-hidden rounded-sm border border-base-300 bg-base-100 shadow-sm ${pageSizePt ? "cursor-crosshair" : ""}`}
      >
        <canvas ref={canvasRef} className="block max-w-full" />
        {pageSizePt && (
          <div
            className="pointer-events-none absolute"
            style={{
              left: `${positionPct.x * 100}%`,
              top: `${positionPct.y * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {marker(PREVIEW_WIDTH_PX / pageSizePt.width)}
          </div>
        )}
      </div>
      <p className="text-center text-xs text-base-content/50">
        {pageSizePt ? "Click or drag on the page to set the position." : "Loading preview..."}
      </p>
    </div>
  );
}
