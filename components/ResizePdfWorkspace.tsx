"use client";

import { useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { describeError } from "@/lib/errorHelpers";

type Status = "idle" | "working" | "done" | "error";
type PresetId = "a4" | "letter" | "legal" | "custom";

const PRESETS: { id: PresetId; label: string; widthPt: number; heightPt: number }[] = [
  { id: "a4", label: "A4", widthPt: 595.28, heightPt: 841.89 },
  { id: "letter", label: "Letter", widthPt: 612, heightPt: 792 },
  { id: "legal", label: "Legal", widthPt: 612, heightPt: 1008 },
  { id: "custom", label: "Custom", widthPt: 0, heightPt: 0 },
];

export function ResizePdfWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preset, setPreset] = useState<PresetId>("a4");
  const [customWidth, setCustomWidth] = useState("612");
  const [customHeight, setCustomHeight] = useState("792");
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

  async function handleResize() {
    if (!file) return;

    const targetWidth = preset === "custom" ? Number(customWidth) : PRESETS.find((p) => p.id === preset)!.widthPt;
    const targetHeight = preset === "custom" ? Number(customHeight) : PRESETS.find((p) => p.id === preset)!.heightPt;
    if (!targetWidth || !targetHeight || targetWidth <= 0 || targetHeight <= 0) {
      setStatus("error");
      setErrorMessage("Enter a valid width and height (in points).");
      return;
    }

    setStatus("working");
    setErrorMessage("");

    try {
      const { PDFDocument } = await import("pdf-lib");
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);

      // page.scale() resizes the page's MediaBox and scales its existing
      // content to match in one step, so nothing gets clipped or repositioned.
      doc.getPages().forEach((page) => {
        const { width, height } = page.getSize();
        page.scale(targetWidth / width, targetHeight / height);
      });

      const outBytes = await doc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("done");
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, error instanceof Error ? `Couldn't resize this PDF: ${error.message}` : "Couldn't resize this PDF.",));
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
          <ToolIcon name="shape-rect" className="h-4 w-4 text-primary" />
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

      <div className="mt-5">
        <p className="text-sm font-medium text-base-content">Target page size</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setPreset(p.id);
                resetOutput();
              }}
              className={`btn btn-sm ${preset === p.id ? "btn-primary" : "btn-outline"}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === "custom" && (
          <div className="mt-3 flex items-center gap-2">
            <input
              type="number"
              value={customWidth}
              onChange={(event) => {
                setCustomWidth(event.target.value);
                resetOutput();
              }}
              placeholder="Width"
              className="input input-bordered input-sm w-28"
            />
            <span className="text-sm text-base-content/50">×</span>
            <input
              type="number"
              value={customHeight}
              onChange={(event) => {
                setCustomHeight(event.target.value);
                resetOutput();
              }}
              placeholder="Height"
              className="input input-bordered input-sm w-28"
            />
            <span className="text-sm text-base-content/50">pt</span>
          </div>
        )}
      </div>

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      <div className="mt-5">
        {status === "done" && downloadUrl ? (
          <a href={downloadUrl} download="resized.pdf" className="btn btn-primary w-full">
            <ToolIcon name="download" className="h-4 w-4" />
            Download PDF
          </a>
        ) : (
          <button
            type="button"
            onClick={handleResize}
            disabled={status === "working"}
            className="btn btn-primary w-full"
          >
            {status === "working" ? "Resizing..." : "Resize PDF"}
          </button>
        )}
      </div>
    </div>
  );
}
