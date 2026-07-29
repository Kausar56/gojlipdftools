"use client";

import { useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";

type Status = "idle" | "working" | "done" | "error";
type Position = "bottom-center" | "bottom-right" | "bottom-left" | "top-center" | "top-right" | "top-left";

const POSITIONS: { id: Position; label: string }[] = [
  { id: "bottom-center", label: "Bottom Center" },
  { id: "bottom-right", label: "Bottom Right" },
  { id: "bottom-left", label: "Bottom Left" },
  { id: "top-center", label: "Top Center" },
  { id: "top-right", label: "Top Right" },
  { id: "top-left", label: "Top Left" },
];

const MARGIN_PT = 24;

export function PageNumbersWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [template, setTemplate] = useState("Page {n} of {total}");
  const [startNumber, setStartNumber] = useState(1);
  const [padding, setPadding] = useState(1);
  const [fontSize, setFontSize] = useState(11);
  const [position, setPosition] = useState<Position>("bottom-center");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

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

  function useBatesPreset() {
    setTemplate("ABC-{n}");
    setPadding(6);
    resetOutput();
  }

  function usePlainPreset() {
    setTemplate("Page {n} of {total}");
    setPadding(1);
    resetOutput();
  }

  async function handleApply() {
    if (!file) return;
    if (!template.includes("{n}")) {
      setStatus("error");
      setErrorMessage("The template must include {n} for the page number.");
      return;
    }

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
        const text = template.replace("{n}", numberStr).replace("{total}", String(pages.length));
        const { width: pageWidth, height: pageHeight } = page.getSize();
        const textWidth = font.widthOfTextAtSize(text, fontSize);

        let x: number;
        let y: number;
        if (position.endsWith("center")) x = (pageWidth - textWidth) / 2;
        else if (position.endsWith("right")) x = pageWidth - MARGIN_PT - textWidth;
        else x = MARGIN_PT;
        y = position.startsWith("bottom") ? MARGIN_PT : pageHeight - MARGIN_PT - fontSize;

        page.drawText(text, { x, y, size: fontSize, font, color: rgb(0, 0, 0) });
      });

      const outBytes = await doc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("done");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? `Couldn't add page numbers: ${error.message}` : "Couldn't add page numbers to this PDF.",
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

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={usePlainPreset} className="btn btn-outline btn-xs">
          Plain Page Numbers
        </button>
        <button type="button" onClick={useBatesPreset} className="btn btn-outline btn-xs">
          Bates Numbering
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-base-content">
          Format
          <input
            type="text"
            value={template}
            onChange={(event) => {
              setTemplate(event.target.value);
              resetOutput();
            }}
            placeholder="e.g. Page {n} of {total}, or ABC-{n}"
            className="input input-bordered mt-1.5 w-full"
          />
        </label>
        <label className="block text-sm font-medium text-base-content">
          Position
          <select
            value={position}
            onChange={(event) => {
              setPosition(event.target.value as Position);
              resetOutput();
            }}
            className="select select-bordered mt-1.5 w-full"
          >
            {POSITIONS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
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
              setFontSize(Math.max(6, Number(event.target.value) || 11));
              resetOutput();
            }}
            className="input input-bordered mt-1.5 w-full"
          />
        </label>
      </div>
      <p className="mt-2 text-xs text-base-content/50">
        Use {"{n}"} for the page number and {"{total}"} for the page count in the format.
      </p>

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      <div className="mt-5">
        {status === "done" && downloadUrl ? (
          <a href={downloadUrl} download="numbered.pdf" className="btn btn-primary w-full">
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
            {status === "working" ? "Applying..." : "Add Page Numbers"}
          </button>
        )}
      </div>
    </div>
  );
}
