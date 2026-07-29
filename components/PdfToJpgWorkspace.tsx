"use client";

import { useEffect, useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { loadPdfjs } from "@/lib/pdfjs";

type Status = "idle" | "working" | "done" | "error";
type ResultItem = { label: string; filename: string; url: string };

const RENDER_SCALE = 2;

export function PdfToJpgWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [progressLabel, setProgressLabel] = useState("");

  useEffect(() => {
    return () => {
      results.forEach((result) => URL.revokeObjectURL(result.url));
    };
  }, [results]);

  function resetOutput() {
    setResults((prev) => {
      prev.forEach((result) => URL.revokeObjectURL(result.url));
      return [];
    });
    setStatus("idle");
    setErrorMessage("");
  }

  function loadFile(selected: File) {
    resetOutput();
    setFile(selected);
  }

  async function handleConvert() {
    if (!file) return;
    setStatus("working");
    setErrorMessage("");

    try {
      const pdfjs = await loadPdfjs();
      const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      const baseName = file.name.replace(/\.pdf$/i, "");
      const outputs: ResultItem[] = [];

      for (let pageIndex = 1; pageIndex <= doc.numPages; pageIndex++) {
        setProgressLabel(`Rendering page ${pageIndex} of ${doc.numPages}...`);
        const page = await doc.getPage(pageIndex);
        const viewport = page.getViewport({ scale: RENDER_SCALE });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        // JPG has no transparency channel — fill white first so pages with a
        // transparent background don't turn black.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
        if (!blob) continue;
        const url = URL.createObjectURL(blob);
        outputs.push({ label: `Page ${pageIndex}`, filename: `${baseName}-page-${pageIndex}.jpg`, url });
      }

      setResults(outputs);
      setStatus("done");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? `Couldn't convert this PDF: ${error.message}` : "Couldn't convert this PDF to images.",
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
          <ToolIcon name="image-to-pdf" className="h-4 w-4 text-accent" />
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

      {status === "working" && (
        <p className="mt-4 text-center text-xs text-base-content/60">{progressLabel}</p>
      )}

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      {results.length > 0 && (
        <ul className="mt-5 max-h-64 space-y-2 overflow-auto">
          {results.map((result) => (
            <li
              key={result.filename}
              className="flex items-center justify-between gap-3 rounded-lg border border-base-300 px-3 py-2 text-sm"
            >
              <span className="text-base-content/80">{result.label}</span>
              <a href={result.url} download={result.filename} className="btn btn-primary btn-xs">
                <ToolIcon name="download" className="h-3.5 w-3.5" />
                Download
              </a>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={handleConvert}
        disabled={status === "working"}
        className="btn btn-primary mt-5 w-full"
      >
        {status === "working" ? "Converting..." : "Convert to JPG"}
      </button>
    </div>
  );
}
