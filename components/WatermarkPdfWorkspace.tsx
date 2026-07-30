"use client";

import { useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { NativeColorInput } from "./NativeColorInput";
import { colorSwatches, hexToRgbFloat, resolveSwatchHex, type ColorSwatchId } from "@/lib/colorSwatches";
import { describeError } from "@/lib/errorHelpers";

type Status = "idle" | "working" | "done" | "error";
type FontFamily = "sans-serif" | "serif" | "monospace";

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

export function WatermarkPdfWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
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
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const activeSwatch = colorSwatches.find((swatch) => swatch.id === colorId) ?? colorSwatches[0];
  const resolvedColorHex = customColorHex ?? resolveSwatchHex(activeSwatch.id);

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
        page.drawText(text, {
          x: width / 2 - textWidth / 2,
          y: height / 2,
          size: fontSize,
          font,
          color: rgb(r, g, b),
          opacity: opacity / 100,
          rotate: degrees(45),
        });
      });

      const outBytes = await doc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("done");
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

      <div className="mt-6 flex flex-col gap-6 sm:flex-row">
        <div className="flex flex-1 flex-col items-center justify-center rounded-sm border border-base-300 bg-base-200 py-10">
          <div className="relative flex h-32 w-24 items-center justify-center overflow-hidden rounded-sm bg-base-100 shadow-sm">
            <span
              className={`whitespace-nowrap text-xs font-bold ${FONT_FAMILIES.find((f) => f.id === fontFamily)?.previewClass ?? ""}`}
              style={{
                color: resolvedColorHex,
                opacity: opacity / 100,
                transform: "rotate(-45deg)",
              }}
            >
              {text || "Your text"}
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-4">
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
