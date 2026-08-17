"use client";

import { useEffect, useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { SaveSuccessModal } from "./SaveSuccessModal";
import { NativeColorInput } from "./NativeColorInput";
import { colorSwatches, hexToRgbFloat, resolveSwatchHex, type ColorSwatchId } from "@/lib/colorSwatches";
import { describeError } from "@/lib/errorHelpers";
import { loadPdfjs } from "@/lib/pdfjs";

type Status = "idle" | "working" | "done" | "error";
type FontFamily = "sans-serif" | "serif" | "monospace";
type PositionPct = { x: number; y: number };

const CENTER_POSITION: PositionPct = { x: 0.5, y: 0.5 };
const PREVIEW_WIDTH_PX = 560;

const FONT_FAMILIES: { id: FontFamily; label: string; previewClass: string }[] = [
  { id: "sans-serif", label: "Sans-serif", previewClass: "font-sans" },
  { id: "serif", label: "Serif", previewClass: "font-serif" },
  { id: "monospace", label: "Monospace", previewClass: "font-mono" },
];

// A longer word needs a smaller font to still fit diagonally on the page than
// a short one does — a single fixed size (the old behavior) either looked
// tiny for short text or ran off the page edge for long text. Reference-
// measures the text at size 1 and solves for the largest size whose rotated
// (45°) bounding box still fits within a safety margin of the page's shorter
// side, using (w+h)*cos(45°) as the rotated footprint's approximate width.
function computeAutoFontSize(text: string, font: { widthOfTextAtSize: (t: string, s: number) => number }, pageWidth: number, pageHeight: number) {
  const unitWidth = font.widthOfTextAtSize(text, 1) || 1;
  const safeDiagonal = Math.min(pageWidth, pageHeight) * 0.85;
  const fontSize = safeDiagonal / ((unitWidth + 1) * Math.SQRT1_2);
  return Math.round(Math.max(12, Math.min(150, fontSize)));
}

function fontFamilyCss(fontFamily: FontFamily) {
  return fontFamily === "serif"
    ? "Georgia, 'Times New Roman', serif"
    : fontFamily === "monospace"
      ? "'Courier New', monospace"
      : "Helvetica, Arial, sans-serif";
}

let measureCtx: CanvasRenderingContext2D | null | undefined;
function getMeasureCtx() {
  if (typeof document === "undefined") return null;
  if (measureCtx === undefined) measureCtx = document.createElement("canvas").getContext("2d");
  return measureCtx;
}

// Mirrors computeAutoFontSize's math, but for the live HTML preview — pdf-lib
// isn't loaded yet at this point (it's a dynamic import used only on save),
// so a canvas-measured text width stands in for the real embedded font's
// metrics. Close enough for a preview; the actual export always measures
// with the real font.
function computeAutoFontSizePreview(text: string, fontFamily: FontFamily, pageWidth: number, pageHeight: number) {
  const ctx = getMeasureCtx();
  if (!ctx) return 60;
  ctx.font = `bold 100px ${fontFamilyCss(fontFamily)}`;
  const unitWidth = (ctx.measureText(text || "Your text").width || 1) / 100;
  const safeDiagonal = Math.min(pageWidth, pageHeight) * 0.85;
  const fontSize = safeDiagonal / ((unitWidth + 1) * Math.SQRT1_2);
  return Math.round(Math.max(12, Math.min(150, fontSize)));
}

export function WatermarkPdfWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("CONFIDENTIAL");
  const [opacity, setOpacity] = useState(35);
  const [colorId, setColorId] = useState<ColorSwatchId>("primary");
  // Set once the user picks a custom shade via the color wheel — overrides
  // the preset swatch selection, same pattern as the preset/custom split
  // used elsewhere (e.g. the Edit PDF text toolbar).
  const [customColorHex, setCustomColorHex] = useState<string | null>(null);
  const [fontFamily, setFontFamily] = useState<FontFamily>("sans-serif");
  // null = auto-fit the size to the text and page for each page; a number
  // once the user drags the slider, overriding the auto-fit.
  const [fontSizeOverride, setFontSizeOverride] = useState<number | null>(null);
  // Degrees, matching pdf-lib's counter-clockwise rotate() — 45 preserves the
  // classic diagonal-stamp look as the default.
  const [rotation, setRotation] = useState(45);
  // Fraction of the page's width/height (0-1, origin top-left) chosen by
  // clicking/dragging on the preview — applied proportionally to every page,
  // so it still makes sense across pages of different sizes.
  const [positionPct, setPositionPct] = useState<PositionPct>(CENTER_POSITION);
  const [pageSizePt, setPageSizePt] = useState<{ width: number; height: number } | null>(null);
  const [pageCount, setPageCount] = useState(0);
  // Which page the preview shows — the watermark itself always applies to
  // every page identically, this only changes what's rendered on screen so
  // pages with a different size/orientation can be checked before exporting.
  const [previewPageIndex, setPreviewPageIndex] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const activeSwatch = colorSwatches.find((swatch) => swatch.id === colorId) ?? colorSwatches[0];
  const resolvedColorHex = customColorHex ?? resolveSwatchHex(activeSwatch.id);

  // Drives the preview span's actual font-size so the "Text size" slider (and
  // auto-fit) are visibly reflected on screen — previously the preview text
  // was a fixed Tailwind size regardless of this, which looked like the
  // slider "didn't work" even though the exported PDF honored it correctly.
  const previewFontSizePt = pageSizePt
    ? fontSizeOverride ?? computeAutoFontSizePreview(text, fontFamily, pageSizePt.width, pageSizePt.height)
    : 24;
  const previewScale = pageSizePt ? PREVIEW_WIDTH_PX / pageSizePt.width : 1;
  const previewFontSizePx = Math.max(8, previewFontSizePt * previewScale);

  // Renders whichever page is selected for preview so the user can see (and
  // click/drag on) the real document instead of a generic mock box — and, for
  // multi-page PDFs, check pages of a different size/orientation before
  // exporting.
  useEffect(() => {
    if (!file) {
      setPageSizePt(null);
      setPageCount(0);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await loadPdfjs();
        const bytes = await file.arrayBuffer();
        const doc = await pdfjs.getDocument({ data: bytes }).promise;
        if (cancelled) return;
        setPageCount(doc.numPages);
        const pageNumber = Math.min(Math.max(previewPageIndex + 1, 1), doc.numPages);
        const page = await doc.getPage(pageNumber);
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
        // Preview render failed (e.g. an unusual PDF structure) — the
        // watermark itself still works with the default centered position,
        // just without a draggable live preview.
        if (!cancelled) setPageSizePt(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, previewPageIndex]);

  function resetOutput() {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setStatus("idle");
    setErrorMessage("");
    setShowSuccessModal(false);
  }

  function loadFile(selected: File) {
    resetOutput();
    setPositionPct(CENTER_POSITION);
    setPreviewPageIndex(0);
    setFile(selected);
  }

  function updatePositionFromClient(clientX: number, clientY: number, rect: DOMRect) {
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    setPositionPct({ x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) });
  }

  function handlePreviewPointerDown(event: React.MouseEvent) {
    if (!pageSizePt) return;
    const box = previewBoxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    updatePositionFromClient(event.clientX, event.clientY, rect);

    function onMove(moveEvent: MouseEvent) {
      updatePositionFromClient(moveEvent.clientX, moveEvent.clientY, rect);
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      resetOutput();
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  async function handleWatermark() {
    if (!file || !text.trim()) return;
    setStatus("working");
    setErrorMessage("");

    try {
      const { PDFDocument, rgb, degrees, StandardFonts } = await import("pdf-lib");
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const standardFont =
        fontFamily === "serif"
          ? StandardFonts.TimesRomanBold
          : fontFamily === "monospace"
            ? StandardFonts.CourierBold
            : StandardFonts.HelveticaBold;
      const font = await doc.embedFont(standardFont);
      const [r, g, b] = hexToRgbFloat(resolvedColorHex);

      doc.getPages().forEach((page) => {
        const { width, height } = page.getSize();
        const fontSize = fontSizeOverride ?? computeAutoFontSize(text, font, width, height);
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        // positionPct's origin is top-left (matching the on-screen preview);
        // PDF coordinates are bottom-left, so the y fraction is flipped. Both
        // offsets center the text on the chosen point rather than starting
        // its baseline there, so it lands where the preview shows it.
        const anchorX = positionPct.x * width;
        const anchorY = height - positionPct.y * height;
        page.drawText(text, {
          x: anchorX - textWidth / 2,
          y: anchorY - fontSize / 2,
          size: fontSize,
          font,
          color: rgb(r, g, b),
          opacity: opacity / 100,
          rotate: degrees(rotation),
        });
      });

      const outBytes = await doc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("done");
      setShowSuccessModal(true);
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, error instanceof Error
          ? `Couldn't watermark this PDF: ${error.message}`
          : "Couldn't watermark this PDF.",));
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
          downloadFileName="watermarked.pdf"
          onClose={() => setShowSuccessModal(false)}
          recommendedSlugs={["merge-pdf", "compress-pdf", "protect-pdf", "page-numbers"]}
        />
      )}

      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 truncate">
          <ToolIcon name="watermark-pdf" className="h-4 w-4 text-accent" />
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

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <div className="flex flex-col items-center justify-center gap-2 rounded-sm border border-base-300 bg-base-200 p-4 lg:flex-3">
          <div
            ref={previewBoxRef}
            onMouseDown={handlePreviewPointerDown}
            className={`relative select-none overflow-hidden rounded-sm bg-base-100 shadow-sm ${pageSizePt ? "cursor-crosshair" : ""}`}
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
                <span
                  className={`whitespace-nowrap font-bold ${FONT_FAMILIES.find((f) => f.id === fontFamily)?.previewClass ?? ""}`}
                  style={{
                    color: resolvedColorHex,
                    opacity: opacity / 100,
                    display: "inline-block",
                    fontSize: `${previewFontSizePx}px`,
                    transform: `rotate(${-rotation}deg)`,
                  }}
                >
                  {text || "Your text"}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <p className="text-center text-xs text-base-content/50">
              {pageSizePt ? "Click or drag on the page to place the watermark." : "Loading preview..."}
            </p>
            {pageSizePt && (positionPct.x !== 0.5 || positionPct.y !== 0.5) && (
              <button
                type="button"
                onClick={() => {
                  setPositionPct(CENTER_POSITION);
                  resetOutput();
                }}
                className="text-xs text-primary hover:underline"
              >
                Reset to center
              </button>
            )}
          </div>
          {pageCount > 1 && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPreviewPageIndex((index) => Math.max(0, index - 1))}
                disabled={previewPageIndex === 0}
                className="btn btn-ghost btn-xs btn-square"
                aria-label="Previous page"
              >
                <ToolIcon name="chevron-down" className="h-3.5 w-3.5 rotate-90" />
              </button>
              <span className="text-xs text-base-content/60">
                Page {previewPageIndex + 1} of {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setPreviewPageIndex((index) => Math.min(pageCount - 1, index + 1))}
                disabled={previewPageIndex === pageCount - 1}
                className="btn btn-ghost btn-xs btn-square"
                aria-label="Next page"
              >
                <ToolIcon name="chevron-down" className="h-3.5 w-3.5 -rotate-90" />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4 lg:flex-2">
          <label className="block text-sm font-medium text-base-content">
            Watermark text
            <input
              type="text"
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                resetOutput();
              }}
              placeholder="e.g. CONFIDENTIAL"
              className="input input-bordered mt-1.5 w-full"
            />
          </label>

          <div>
            <p className="text-sm font-medium text-base-content">Font</p>
            <div className="mt-1.5 flex gap-2">
              {FONT_FAMILIES.map((family) => (
                <button
                  key={family.id}
                  type="button"
                  onClick={() => {
                    setFontFamily(family.id);
                    resetOutput();
                  }}
                  className={`btn btn-sm ${fontFamily === family.id ? "btn-primary" : "btn-outline"}`}
                >
                  {family.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-base-content">Color</p>
            <div className="mt-1.5 flex items-center gap-2">
              {colorSwatches.map((swatch) => (
                <button
                  key={swatch.id}
                  type="button"
                  onClick={() => {
                    setColorId(swatch.id);
                    setCustomColorHex(null);
                    resetOutput();
                  }}
                  aria-label={`Use ${swatch.id} color`}
                  className={`h-6 w-6 rounded-full ${swatch.className} ${
                    customColorHex === null && colorId === swatch.id
                      ? "ring-2 ring-base-content/40 ring-offset-2 ring-offset-base-100"
                      : ""
                  }`}
                />
              ))}
              <label
                className="relative flex h-6 w-6 items-center justify-center rounded-full border border-base-300"
                style={{
                  background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
                  boxShadow: customColorHex !== null ? "0 0 0 2px var(--color-base-content)" : undefined,
                }}
                title="Custom color"
                aria-label="Choose a custom color"
              >
                <NativeColorInput
                  value={resolvedColorHex}
                  onChange={(color) => {
                    setCustomColorHex(color);
                    resetOutput();
                  }}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </label>
            </div>
          </div>

          <label className="block text-sm font-medium text-base-content">
            Opacity — {opacity}%
            <input
              type="range"
              min={10}
              max={90}
              value={opacity}
              onChange={(event) => {
                setOpacity(Number(event.target.value));
                resetOutput();
              }}
              className="range range-sm range-primary mt-1.5"
            />
          </label>

          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-base-content">
                Text size — {fontSizeOverride ?? "Auto"}
              </p>
              {fontSizeOverride !== null && (
                <button
                  type="button"
                  onClick={() => {
                    setFontSizeOverride(null);
                    resetOutput();
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  Reset to auto
                </button>
              )}
            </div>
            <input
              type="range"
              min={12}
              max={150}
              // Auto-fit has no single number until save time (it depends on
              // each page's own size), so show a reasonable mid-point on the
              // slider until the user actually drags it to set an explicit size.
              value={fontSizeOverride ?? 60}
              onChange={(event) => {
                setFontSizeOverride(Number(event.target.value));
                resetOutput();
              }}
              className="range range-sm range-primary mt-1.5"
            />
            <p className="mt-1 text-xs text-base-content/50">
              Auto-fits to the page by default — longer text starts smaller so it doesn&apos;t run off the edge.
              Drag to set an exact size instead.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-base-content">Rotation — {rotation}°</p>
              {rotation !== 45 && (
                <button
                  type="button"
                  onClick={() => {
                    setRotation(45);
                    resetOutput();
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  Reset to diagonal
                </button>
              )}
            </div>
            <input
              type="range"
              min={-90}
              max={90}
              value={rotation}
              onChange={(event) => {
                setRotation(Number(event.target.value));
                resetOutput();
              }}
              className="range range-sm range-primary mt-1.5"
            />
            <p className="mt-1 text-xs text-base-content/50">
              Defaults to a 45° diagonal stamp — drag to lay it flat (0°), vertical (90°), or anywhere in between.
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      <div className="mt-6">
        {status === "done" && downloadUrl ? (
          <a href={downloadUrl} download="watermarked.pdf" className="btn btn-primary w-full">
            <ToolIcon name="download" className="h-4 w-4" />
            Download Watermarked PDF
          </a>
        ) : (
          <button
            type="button"
            onClick={handleWatermark}
            disabled={!text.trim() || status === "working"}
            className="btn btn-primary w-full"
          >
            {status === "working" ? "Adding watermark..." : "Watermark PDF"}
          </button>
        )}
      </div>
    </div>
  );
}
