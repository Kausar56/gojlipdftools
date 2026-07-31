"use client";

import { useEffect, useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { loadPdfjs } from "@/lib/pdfjs";
import { describeError } from "@/lib/errorHelpers";
import { colorSwatches, hexToRgbFloat, resolveSwatchHex } from "@/lib/colorSwatches";
import { NativeColorInput } from "./NativeColorInput";

type Status = "idle" | "working" | "done" | "error";
type FontFamily = "sans-serif" | "serif" | "monospace";

type Zones = {
  headerLeft: string;
  headerCenter: string;
  headerRight: string;
  footerLeft: string;
  footerCenter: string;
  footerRight: string;
};

type Style = {
  fontFamily: FontFamily;
  fontSize: number;
  colorHex: string;
};

type PageConfig = { zones: Zones; style: Style };

const emptyZones: Zones = {
  headerLeft: "",
  headerCenter: "",
  headerRight: "",
  footerLeft: "",
  footerCenter: "",
  footerRight: "",
};

const defaultStyle: Style = { fontFamily: "sans-serif", fontSize: 10, colorHex: "#333333" };

function makeDefaultConfig(): PageConfig {
  return { zones: { ...emptyZones }, style: { ...defaultStyle } };
}

const FIELDS: { key: keyof Zones; label: string }[] = [
  { key: "headerLeft", label: "Header — Left" },
  { key: "headerCenter", label: "Header — Center" },
  { key: "headerRight", label: "Header — Right" },
  { key: "footerLeft", label: "Footer — Left" },
  { key: "footerCenter", label: "Footer — Center" },
  { key: "footerRight", label: "Footer — Right" },
];

const FONT_FAMILIES: { id: FontFamily; label: string; previewClass: string }[] = [
  { id: "sans-serif", label: "Sans-serif", previewClass: "font-sans" },
  { id: "serif", label: "Serif", previewClass: "font-serif" },
  { id: "monospace", label: "Monospace", previewClass: "font-mono" },
];

const MARGIN_PT = 24;
const PREVIEW_WIDTH_PX = 340;

function resolveTemplate(template: string, pageNumber: number, totalPages: number) {
  return template.replace("{page}", String(pageNumber)).replace("{pages}", String(totalPages));
}

export function HeaderFooterWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [previewPageIndex, setPreviewPageIndex] = useState(0);
  const [previewScale, setPreviewScale] = useState<number | null>(null);
  const [defaultConfig, setDefaultConfig] = useState<PageConfig>(makeDefaultConfig());
  // Only pages the user explicitly customized appear here (keyed by 0-based
  // index) — every other page just uses defaultConfig, so most documents need
  // no per-page entries at all.
  const [pageOverrides, setPageOverrides] = useState<Record<number, PageConfig>>({});
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
    setPreviewPageIndex(0);
    setDefaultConfig(makeDefaultConfig());
    setPageOverrides({});
    try {
      const pdfjs = await loadPdfjs();
      const doc = await pdfjs.getDocument({ data: await selected.arrayBuffer() }).promise;
      setPageCount(doc.numPages);
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, "Couldn't read this file — make sure it's a valid PDF."));
    }
  }

  // Renders whichever page is selected, with the effective header/footer text
  // for THAT page overlaid at roughly the position it'll actually print —
  // the easiest way to confirm a per-page override is really taking effect.
  useEffect(() => {
    if (!file || !pageCount) return;
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await loadPdfjs();
        const bytes = await file.arrayBuffer();
        const doc = await pdfjs.getDocument({ data: bytes }).promise;
        const pageNumber = Math.min(Math.max(previewPageIndex + 1, 1), doc.numPages);
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
        setPreviewScale(scale);
      } catch {
        // Preview render failed (e.g. an unusual PDF structure) — the tool
        // itself still works, just without a page preview.
        if (!cancelled) setPreviewScale(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, pageCount, previewPageIndex]);

  const hasOverride = previewPageIndex in pageOverrides;
  const activeConfig = pageOverrides[previewPageIndex] ?? defaultConfig;

  function updateDefaultField(key: keyof Zones, value: string) {
    setDefaultConfig((prev) => ({ ...prev, zones: { ...prev.zones, [key]: value } }));
    resetOutput();
  }

  function updateDefaultStyle(patch: Partial<Style>) {
    setDefaultConfig((prev) => ({ ...prev, style: { ...prev.style, ...patch } }));
    resetOutput();
  }

  function updateOverrideField(key: keyof Zones, value: string) {
    setPageOverrides((prev) => {
      const current = prev[previewPageIndex] ?? defaultConfig;
      return { ...prev, [previewPageIndex]: { ...current, zones: { ...current.zones, [key]: value } } };
    });
    resetOutput();
  }

  function updateOverrideStyle(patch: Partial<Style>) {
    setPageOverrides((prev) => {
      const current = prev[previewPageIndex] ?? defaultConfig;
      return { ...prev, [previewPageIndex]: { ...current, style: { ...current.style, ...patch } } };
    });
    resetOutput();
  }

  function toggleOverride(enabled: boolean) {
    setPageOverrides((prev) => {
      const next = { ...prev };
      if (enabled) {
        // Start from the current default so untouched fields still match it,
        // rather than surprising the user with a blank page.
        next[previewPageIndex] = { zones: { ...defaultConfig.zones }, style: { ...defaultConfig.style } };
      } else {
        delete next[previewPageIndex];
      }
      return next;
    });
    resetOutput();
  }

  async function handleApply() {
    if (!file) return;
    const hasAnyText =
      Object.values(defaultConfig.zones).some((v) => v.trim()) ||
      Object.values(pageOverrides).some((config) => Object.values(config.zones).some((v) => v.trim()));
    if (!hasAnyText) {
      setStatus("error");
      setErrorMessage("Fill in at least one header or footer field.");
      return;
    }

    setStatus("working");
    setErrorMessage("");

    try {
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const fontsByFamily: Record<FontFamily, Awaited<ReturnType<typeof doc.embedFont>>> = {
        "sans-serif": await doc.embedFont(StandardFonts.Helvetica),
        serif: await doc.embedFont(StandardFonts.TimesRoman),
        monospace: await doc.embedFont(StandardFonts.Courier),
      };
      const pages = doc.getPages();

      pages.forEach((page, index) => {
        const config = pageOverrides[index] ?? defaultConfig;
        const { zones, style } = config;
        const font = fontsByFamily[style.fontFamily];
        const [r, g, b] = hexToRgbFloat(style.colorHex);
        const { width: pageWidth, height: pageHeight } = page.getSize();
        const pageNumber = index + 1;

        const draw = (rawText: string, y: number, align: "left" | "center" | "right") => {
          const text = resolveTemplate(rawText, pageNumber, pages.length);
          if (!text.trim()) return;
          const textWidth = font.widthOfTextAtSize(text, style.fontSize);
          const x =
            align === "center"
              ? (pageWidth - textWidth) / 2
              : align === "right"
                ? pageWidth - MARGIN_PT - textWidth
                : MARGIN_PT;
          page.drawText(text, { x, y, size: style.fontSize, font, color: rgb(r, g, b) });
        };

        draw(zones.headerLeft, pageHeight - MARGIN_PT, "left");
        draw(zones.headerCenter, pageHeight - MARGIN_PT, "center");
        draw(zones.headerRight, pageHeight - MARGIN_PT, "right");
        draw(zones.footerLeft, MARGIN_PT - style.fontSize, "left");
        draw(zones.footerCenter, MARGIN_PT - style.fontSize, "center");
        draw(zones.footerRight, MARGIN_PT - style.fontSize, "right");
      });

      const outBytes = await doc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("done");
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, error instanceof Error ? `Couldn't add header/footer: ${error.message}` : "Couldn't add a header or footer to this PDF.",));
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

  const overrideCount = Object.keys(pageOverrides).length;

  function renderStyleControls(style: Style, onChange: (patch: Partial<Style>) => void) {
    const activeSwatch = colorSwatches.find((swatch) => resolveSwatchHex(swatch.id) === style.colorHex);
    return (
      <div className="mt-3 flex flex-wrap items-end gap-4">
        <div>
          <p className="text-xs font-medium text-base-content/70">Font</p>
          <div className="mt-1 flex gap-1">
            {FONT_FAMILIES.map((family) => (
              <button
                key={family.id}
                type="button"
                onClick={() => onChange({ fontFamily: family.id })}
                className={`btn btn-xs ${style.fontFamily === family.id ? "btn-primary" : "btn-outline"}`}
              >
                {family.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-base-content/70">Color</p>
          <div className="mt-1 flex items-center gap-1.5">
            {colorSwatches.map((swatch) => (
              <button
                key={swatch.id}
                type="button"
                onClick={() => onChange({ colorHex: resolveSwatchHex(swatch.id) })}
                aria-label={`Use ${swatch.id} color`}
                className={`h-5 w-5 rounded-full ${swatch.className} ${
                  activeSwatch?.id === swatch.id ? "ring-2 ring-base-content/40 ring-offset-1 ring-offset-base-100" : ""
                }`}
              />
            ))}
            <label
              className="relative flex h-5 w-5 items-center justify-center rounded-full border border-base-300"
              style={{
                background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
                boxShadow: !activeSwatch ? "0 0 0 2px var(--color-base-content)" : undefined,
              }}
              title="Custom color"
              aria-label="Choose a custom color"
            >
              <NativeColorInput
                value={style.colorHex}
                onChange={(color) => onChange({ colorHex: color })}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
          </div>
        </div>

        <label className="block text-xs font-medium text-base-content/70">
          Size
          <input
            type="number"
            min={6}
            max={72}
            value={style.fontSize}
            onChange={(event) => onChange({ fontSize: Math.max(6, Number(event.target.value) || 10) })}
            className="input input-bordered input-xs mt-1 w-16"
          />
        </label>
      </div>
    );
  }

  return (
    <div className="card border border-base-300 bg-base-100 p-6 shadow-sm">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 truncate">
          <ToolIcon name="text-multiline" className="h-4 w-4 text-secondary" />
          <span className="truncate text-base-content/80">{file.name}</span>
          {pageCount && <span className="badge badge-neutral badge-sm">{pageCount} pages</span>}
        </span>
        <button
          type="button"
          onClick={() => {
            setFile(null);
            setPageCount(null);
            resetOutput();
          }}
          className="text-xs text-base-content/50 hover:text-error"
        >
          Replace
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <div className="flex flex-col items-center gap-2 lg:flex-3">
          <div className="relative overflow-hidden rounded-sm border border-base-300 bg-base-200 shadow-sm">
            <canvas ref={previewCanvasRef} className="block max-w-full" />
            {previewScale && pageCount && (
              <div
                className={`pointer-events-none absolute inset-0 leading-none ${
                  FONT_FAMILIES.find((f) => f.id === activeConfig.style.fontFamily)?.previewClass ?? ""
                }`}
                style={{ fontSize: Math.max(6, activeConfig.style.fontSize * previewScale), color: activeConfig.style.colorHex }}
              >
                <span style={{ position: "absolute", top: MARGIN_PT * previewScale, left: MARGIN_PT * previewScale }}>
                  {resolveTemplate(activeConfig.zones.headerLeft, previewPageIndex + 1, pageCount)}
                </span>
                <span
                  style={{
                    position: "absolute",
                    top: MARGIN_PT * previewScale,
                    left: "50%",
                    transform: "translateX(-50%)",
                  }}
                >
                  {resolveTemplate(activeConfig.zones.headerCenter, previewPageIndex + 1, pageCount)}
                </span>
                <span
                  style={{ position: "absolute", top: MARGIN_PT * previewScale, right: MARGIN_PT * previewScale }}
                >
                  {resolveTemplate(activeConfig.zones.headerRight, previewPageIndex + 1, pageCount)}
                </span>
                <span
                  style={{
                    position: "absolute",
                    bottom: (MARGIN_PT - activeConfig.style.fontSize) * previewScale,
                    left: MARGIN_PT * previewScale,
                  }}
                >
                  {resolveTemplate(activeConfig.zones.footerLeft, previewPageIndex + 1, pageCount)}
                </span>
                <span
                  style={{
                    position: "absolute",
                    bottom: (MARGIN_PT - activeConfig.style.fontSize) * previewScale,
                    left: "50%",
                    transform: "translateX(-50%)",
                  }}
                >
                  {resolveTemplate(activeConfig.zones.footerCenter, previewPageIndex + 1, pageCount)}
                </span>
                <span
                  style={{
                    position: "absolute",
                    bottom: (MARGIN_PT - activeConfig.style.fontSize) * previewScale,
                    right: MARGIN_PT * previewScale,
                  }}
                >
                  {resolveTemplate(activeConfig.zones.footerRight, previewPageIndex + 1, pageCount)}
                </span>
              </div>
            )}
          </div>
          {pageCount && pageCount > 1 && (
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
                {hasOverride && <span className="ml-1 text-primary">(custom)</span>}
              </span>
              <button
                type="button"
                onClick={() => setPreviewPageIndex((index) => Math.min((pageCount ?? 1) - 1, index + 1))}
                disabled={previewPageIndex === pageCount - 1}
                className="btn btn-ghost btn-xs btn-square"
                aria-label="Next page"
              >
                <ToolIcon name="chevron-down" className="h-3.5 w-3.5 -rotate-90" />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-5 lg:flex-2">
          <div>
            <p className="text-sm font-medium text-base-content">Default (applies to every page)</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {FIELDS.map((field) => (
                <label key={field.key} className="block text-sm font-medium text-base-content">
                  {field.label}
                  <input
                    type="text"
                    value={defaultConfig.zones[field.key]}
                    onChange={(event) => updateDefaultField(field.key, event.target.value)}
                    placeholder="e.g. Confidential, {page} of {pages}"
                    className="input input-bordered input-sm mt-1.5 w-full"
                  />
                </label>
              ))}
            </div>
            {renderStyleControls(defaultConfig.style, updateDefaultStyle)}
          </div>

          {pageCount && pageCount > 1 && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-base-content">
                <input
                  type="checkbox"
                  checked={hasOverride}
                  onChange={(event) => toggleOverride(event.target.checked)}
                  className="checkbox checkbox-sm"
                />
                Use a different header/footer for page {previewPageIndex + 1}
              </label>

              {hasOverride && (
                <div className="mt-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {FIELDS.map((field) => (
                      <label key={field.key} className="block text-sm font-medium text-base-content">
                        {field.label}
                        <input
                          type="text"
                          value={pageOverrides[previewPageIndex]?.zones[field.key] ?? ""}
                          onChange={(event) => updateOverrideField(field.key, event.target.value)}
                          placeholder="e.g. Confidential, {page} of {pages}"
                          className="input input-bordered input-sm mt-1.5 w-full"
                        />
                      </label>
                    ))}
                  </div>
                  {pageOverrides[previewPageIndex] &&
                    renderStyleControls(pageOverrides[previewPageIndex].style, updateOverrideStyle)}
                </div>
              )}
              {overrideCount > 0 && (
                <p className="mt-1.5 text-xs text-base-content/50">
                  {overrideCount} of {pageCount} page{overrideCount === 1 ? "" : "s"} customized. Navigate the
                  preview above to edit another page.
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-base-content/50">
            Use {"{page}"} for the current page number and {"{pages}"} for the total page count.
          </p>
        </div>
      </div>

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      <div className="mt-5">
        {status === "done" && downloadUrl ? (
          <a href={downloadUrl} download="header-footer.pdf" className="btn btn-primary w-full">
            <ToolIcon name="download" className="h-4 w-4" />
            Download PDF
          </a>
        ) : (
          <button
            type="button"
            onClick={handleApply}
            disabled={status === "working"}
            className="btn btn-primary w-full"
          >
            {status === "working" ? "Applying..." : "Add Header & Footer"}
          </button>
        )}
      </div>
    </div>
  );
}
