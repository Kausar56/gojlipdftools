"use client";

import { useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { colorSwatches, hexToRgbFloat, resolveSwatchHex, type ColorSwatchId } from "@/lib/colorSwatches";

type Status = "idle" | "working" | "done" | "error";

export function WatermarkPdfWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("CONFIDENTIAL");
  const [opacity, setOpacity] = useState(35);
  const [colorId, setColorId] = useState<ColorSwatchId>("primary");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const activeSwatch = colorSwatches.find((swatch) => swatch.id === colorId) ?? colorSwatches[0];

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
      const font = await doc.embedFont(StandardFonts.HelveticaBold);
      const [r, g, b] = hexToRgbFloat(resolveSwatchHex(activeSwatch.id));

      doc.getPages().forEach((page) => {
        const { width, height } = page.getSize();
        const fontSize = Math.max(24, Math.min(width, height) / 6);
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
      setErrorMessage(
        error instanceof Error
          ? `Couldn't watermark this PDF: ${error.message}`
          : "Couldn't watermark this PDF.",
      );
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
              className="whitespace-nowrap text-xs font-bold"
              style={{
                color: resolveSwatchHex(activeSwatch.id),
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
            <p className="text-sm font-medium text-base-content">Color</p>
            <div className="mt-1.5 flex gap-2">
              {colorSwatches.map((swatch) => (
                <button
                  key={swatch.id}
                  type="button"
                  onClick={() => {
                    setColorId(swatch.id);
                    resetOutput();
                  }}
                  aria-label={`Use ${swatch.id} color`}
                  className={`h-6 w-6 rounded-full ${swatch.className} ${
                    colorId === swatch.id ? "ring-2 ring-base-content/40 ring-offset-2 ring-offset-base-100" : ""
                  }`}
                />
              ))}
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
