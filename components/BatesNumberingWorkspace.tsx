"use client";

import { useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { PagePreviewPicker, type PositionPct } from "./PagePreviewPicker";
import { SaveSuccessModal } from "./SaveSuccessModal";
import { describeError } from "@/lib/errorHelpers";

type Status = "idle" | "working" | "done" | "error";

const BOTTOM_RIGHT: PositionPct = { x: 0.92, y: 0.95 };

const POSITION_PRESETS: { label: string; pct: PositionPct }[] = [
  { label: "Bottom Right", pct: { x: 0.92, y: 0.95 } },
  { label: "Bottom Center", pct: { x: 0.5, y: 0.95 } },
  { label: "Bottom Left", pct: { x: 0.08, y: 0.95 } },
  { label: "Top Right", pct: { x: 0.92, y: 0.05 } },
  { label: "Top Center", pct: { x: 0.5, y: 0.05 } },
  { label: "Top Left", pct: { x: 0.08, y: 0.05 } },
];

export function BatesNumberingWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [prefix, setPrefix] = useState("ABC-");
  const [startNumber, setStartNumber] = useState(1);
  const [padding, setPadding] = useState(6);
  const [fontSize, setFontSize] = useState(9);
  const [positionPct, setPositionPct] = useState<PositionPct>(BOTTOM_RIGHT);
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

  function loadFile(selected: File) {
    resetOutput();
    setPositionPct(BOTTOM_RIGHT);
    setFile(selected);
  }

  async function handleApply() {
    if (!file) return;
    setStatus("working");
    setErrorMessage("");

    try {
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const pages = doc.getPages();

      pages.forEach((page, index) => {
        const numberStr = String(startNumber + index).padStart(padding, "0");
        const text = `${prefix}${numberStr}`;
        const { width: pageWidth, height: pageHeight } = page.getSize();
        const textWidth = font.widthOfTextAtSize(text, fontSize);

        // positionPct's origin is top-left (matching the on-screen preview);
        // PDF coordinates are bottom-left, so the y fraction is flipped. Both
        // offsets center the text on the chosen point, matching what the
        // preview shows.
        const anchorX = positionPct.x * pageWidth;
        const anchorY = pageHeight - positionPct.y * pageHeight;

        page.drawText(text, {
          x: anchorX - textWidth / 2,
          y: anchorY - fontSize / 2,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
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
      setErrorMessage(describeError(error, error instanceof Error ? `Couldn't add Bates numbering: ${error.message}` : "Couldn't add Bates numbering to this PDF.",));
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

  const previewNumber = `${prefix}${String(startNumber).padStart(padding, "0")}`;

  return (
    <div className="card border border-base-300 bg-base-100 p-6 shadow-sm">
      {showSuccessModal && downloadUrl && (
        <SaveSuccessModal
          downloadUrl={downloadUrl}
          downloadFileName="bates-numbered.pdf"
          onClose={() => setShowSuccessModal(false)}
        />
      )}

      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 truncate">
          <ToolIcon name="text-multiline" className="h-4 w-4 text-primary" />
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
        <div className="lg:flex-3">
          <PagePreviewPicker
            file={file}
            positionPct={positionPct}
            onPositionChange={(pct) => {
              setPositionPct(pct);
              resetOutput();
            }}
            marker={(scale) => (
              <span
                className="whitespace-nowrap rounded bg-primary/10 px-1 font-medium text-primary"
                style={{ fontSize: Math.max(6, fontSize * scale) }}
              >
                {previewNumber}
              </span>
            )}
          />
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {POSITION_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setPositionPct(preset.pct);
                  resetOutput();
                }}
                className={`btn btn-xs ${
                  positionPct.x === preset.pct.x && positionPct.y === preset.pct.y ? "btn-primary" : "btn-outline"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 lg:flex-2">
          <label className="block text-sm font-medium text-base-content">
            Prefix
            <input
              type="text"
              value={prefix}
              onChange={(event) => {
                setPrefix(event.target.value);
                resetOutput();
              }}
              placeholder="e.g. ABC-"
              className="input input-bordered mt-1.5 w-full"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-base-content">
              Start at
              <input
                type="number"
                min={0}
                value={startNumber}
                onChange={(event) => {
                  setStartNumber(Number(event.target.value) || 0);
                  resetOutput();
                }}
                className="input input-bordered mt-1.5 w-full"
              />
            </label>
            <label className="block text-sm font-medium text-base-content">
              Digit padding
              <input
                type="number"
                min={1}
                max={10}
                value={padding}
                onChange={(event) => {
                  setPadding(Math.max(1, Number(event.target.value) || 1));
                  resetOutput();
                }}
                className="input input-bordered mt-1.5 w-full"
              />
            </label>
            <label className="block text-sm font-medium text-base-content">
              Font size
              <input
                type="number"
                min={6}
                max={72}
                value={fontSize}
                onChange={(event) => {
                  setFontSize(Math.max(6, Number(event.target.value) || 9));
                  resetOutput();
                }}
                className="input input-bordered mt-1.5 w-full"
              />
            </label>
          </div>
          <p className="text-xs text-base-content/50">
            Preview: <span className="font-medium text-base-content">{previewNumber}</span> (increments by 1 on
            every page)
          </p>
        </div>
      </div>

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      <div className="mt-5">
        {status === "done" && downloadUrl ? (
          <a href={downloadUrl} download="bates-numbered.pdf" className="btn btn-primary w-full">
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
            {status === "working" ? "Applying..." : "Add Bates Numbering"}
          </button>
        )}
      </div>
    </div>
  );
}
