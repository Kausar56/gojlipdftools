"use client";

import { useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { describeError } from "@/lib/errorHelpers";

type Status = "idle" | "working" | "done" | "error";
type LayoutId = "2" | "4" | "6" | "9";
type Orientation = "portrait" | "landscape";

const LAYOUTS: { id: LayoutId; label: string; cols: number; rows: number }[] = [
  { id: "2", label: "2-up", cols: 1, rows: 2 },
  { id: "4", label: "4-up", cols: 2, rows: 2 },
  { id: "6", label: "6-up", cols: 2, rows: 3 },
  { id: "9", label: "9-up", cols: 3, rows: 3 },
];

const A4_PT = { width: 595.28, height: 841.89 };
const MARGIN_PT = 10;

export function NUpWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [layout, setLayout] = useState<LayoutId>("4");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
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

  async function handleNUp() {
    if (!file) return;
    setStatus("working");
    setErrorMessage("");

    try {
      const { PDFDocument } = await import("pdf-lib");
      const bytes = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(bytes);
      const outDoc = await PDFDocument.create();
      const totalPages = srcDoc.getPageCount();
      const embeddedPages = await outDoc.embedPdf(srcDoc, srcDoc.getPageIndices());

      const { cols, rows } = LAYOUTS.find((item) => item.id === layout)!;
      const perSheet = cols * rows;
      const sheetWidth = orientation === "portrait" ? A4_PT.width : A4_PT.height;
      const sheetHeight = orientation === "portrait" ? A4_PT.height : A4_PT.width;
      const cellWidth = sheetWidth / cols;
      const cellHeight = sheetHeight / rows;

      for (let sheetStart = 0; sheetStart < totalPages; sheetStart += perSheet) {
        const outPage = outDoc.addPage([sheetWidth, sheetHeight]);
        for (let slot = 0; slot < perSheet && sheetStart + slot < totalPages; slot++) {
          const embedded = embeddedPages[sheetStart + slot];
          const col = slot % cols;
          const row = Math.floor(slot / cols);
          const cellX = col * cellWidth;
          const cellY = sheetHeight - (row + 1) * cellHeight;

          const availWidth = cellWidth - MARGIN_PT * 2;
          const availHeight = cellHeight - MARGIN_PT * 2;
          const scale = Math.min(availWidth / embedded.width, availHeight / embedded.height);
          const drawWidth = embedded.width * scale;
          const drawHeight = embedded.height * scale;

          outPage.drawPage(embedded, {
            x: cellX + (cellWidth - drawWidth) / 2,
            y: cellY + (cellHeight - drawHeight) / 2,
            width: drawWidth,
            height: drawHeight,
          });
        }
      }

      const outBytes = await outDoc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("done");
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, error instanceof Error ? `Couldn't lay out this PDF: ${error.message}` : "Couldn't lay out this PDF.",));
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
          <ToolIcon name="grid" className="h-4 w-4 text-primary" />
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
        <p className="text-sm font-medium text-base-content">Pages per sheet</p>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {LAYOUTS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setLayout(item.id);
                resetOutput();
              }}
              className={`rounded-lg border px-3 py-2.5 text-center text-sm transition ${
                layout === item.id
                  ? "border-primary bg-primary/5 text-base-content"
                  : "border-base-300 text-base-content/70 hover:border-primary/40"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium text-base-content">Sheet orientation</p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setOrientation("portrait");
              resetOutput();
            }}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
              orientation === "portrait"
                ? "border-primary bg-primary/5 text-base-content"
                : "border-base-300 text-base-content/70 hover:border-primary/40"
            }`}
          >
            Portrait
          </button>
          <button
            type="button"
            onClick={() => {
              setOrientation("landscape");
              resetOutput();
            }}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
              orientation === "landscape"
                ? "border-primary bg-primary/5 text-base-content"
                : "border-base-300 text-base-content/70 hover:border-primary/40"
            }`}
          >
            Landscape
          </button>
        </div>
        <p className="mt-2 text-xs text-base-content/50">
          Each output sheet is A4-sized. Pages are scaled down to fit each cell, keeping their original
          proportions.
        </p>
      </div>

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      <div className="mt-6">
        {status === "done" && downloadUrl ? (
          <a href={downloadUrl} download="n-up.pdf" className="btn btn-primary w-full">
            <ToolIcon name="download" className="h-4 w-4" />
            Download PDF
          </a>
        ) : (
          <button
            type="button"
            onClick={handleNUp}
            disabled={status === "working"}
            className="btn btn-primary w-full"
          >
            {status === "working" ? "Laying out..." : "Create N-up PDF"}
          </button>
        )}
      </div>
    </div>
  );
}
