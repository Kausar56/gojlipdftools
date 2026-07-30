"use client";

import { useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { loadPdfjs } from "@/lib/pdfjs";
import { describeError } from "@/lib/errorHelpers";

type Status = "idle" | "processing" | "done" | "error";
type LangCode = "eng" | "ben";

const LANGUAGES: { code: LangCode; label: string }[] = [
  { code: "eng", label: "English" },
  { code: "ben", label: "Bengali" },
];

// PDF points -> canvas pixels for the page render each word's bbox is measured
// against — must match the `scale` passed to page.getViewport below.
const RENDER_SCALE = 2;

export function OcrPdfWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [languages, setLanguages] = useState<LangCode[]>(["eng"]);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  function resetOutput() {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setStatus("idle");
    setProgress(0);
    setProgressLabel("");
    setErrorMessage("");
  }

  async function loadFile(selected: File) {
    resetOutput();
    setFile(selected);
    setPageCount(null);
    try {
      const pdfjs = await loadPdfjs();
      const doc = await pdfjs.getDocument({ data: await selected.arrayBuffer() }).promise;
      setPageCount(doc.numPages);
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        describeError(error, "Couldn't read this file — make sure it's a valid PDF."),
      );
    }
  }

  function toggleLanguage(code: LangCode) {
    setLanguages((prev) => {
      const next = prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code];
      return next.length > 0 ? next : prev; // never allow zero languages selected
    });
  }

  async function handleOcr() {
    if (!file || !pageCount) return;
    setStatus("processing");
    setProgress(0);
    setErrorMessage("");

    try {
      const [pdfjs, { createWorker }, { PDFDocument, StandardFonts }] = await Promise.all([
        loadPdfjs(),
        import("tesseract.js"),
        import("pdf-lib"),
      ]);

      const bytes = await file.arrayBuffer();
      const pdfjsDoc = await pdfjs.getDocument({ data: bytes.slice(0) }).promise;
      const outDoc = await PDFDocument.load(bytes);
      const font = await outDoc.embedFont(StandardFonts.Helvetica);

      const worker = await createWorker(languages.join("+"), undefined, {
        logger: (message) => {
          if (message.status === "recognizing text") {
            setProgressLabel(`Recognizing text... ${Math.round(message.progress * 100)}%`);
          }
        },
      });

      for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
        setProgressLabel(`Reading page ${pageIndex + 1} of ${pageCount}...`);
        const page = await pdfjsDoc.getPage(pageIndex + 1);
        const viewport = page.getViewport({ scale: RENDER_SCALE });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;

        const { data } = await worker.recognize(canvas);
        const outPage = outDoc.getPage(pageIndex);
        const pageHeightPt = outPage.getHeight();

        // Real text-editing of an existing PDF isn't possible without rewriting
        // its content stream (see the Edit PDF tool's mask-and-redraw notes) —
        // here we don't need to touch the visible page at all, just add a real
        // text-showing operator on top at opacity 0. The glyphs never paint,
        // but PDF readers' text extraction/search/selection reads the content
        // stream's text operators regardless of opacity, so the page becomes
        // searchable and selectable without changing how it looks.
        for (const block of data.blocks ?? []) {
          for (const paragraph of block.paragraphs) {
            for (const line of paragraph.lines) {
              for (const word of line.words) {
                const text = word.text.trim();
                if (!text) continue;
                const widthPt = (word.bbox.x1 - word.bbox.x0) / RENDER_SCALE;
                const heightPt = (word.bbox.y1 - word.bbox.y0) / RENDER_SCALE;
                if (widthPt <= 0 || heightPt <= 0) continue;
                const xPt = word.bbox.x0 / RENDER_SCALE;
                const topPt = word.bbox.y0 / RENDER_SCALE;
                const unitWidth = font.widthOfTextAtSize(text, 1) || 1;
                const fontSize = Math.max(1, widthPt / unitWidth);
                outPage.drawText(text, {
                  x: xPt,
                  y: pageHeightPt - topPt - heightPt,
                  size: fontSize,
                  font,
                  opacity: 0,
                });
              }
            }
          }
        }

        setProgress(Math.round(((pageIndex + 1) / pageCount) * 100));
      }

      await worker.terminate();

      const outBytes = await outDoc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("done");
      setProgressLabel("Done.");
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, error instanceof Error ? `Couldn't run OCR on this PDF: ${error.message}` : "Couldn't run OCR on this PDF.",));
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
        <p className="text-sm text-base-content/70">Drag & drop a scanned PDF here, or</p>
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
          <ToolIcon name="ocr" className="h-4 w-4 text-secondary" />
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
          disabled={status === "processing"}
          className="text-xs text-base-content/50 hover:text-error disabled:opacity-40"
        >
          Replace
        </button>
      </div>

      <div className="mt-6">
        <p className="text-sm font-medium text-base-content/80">Language</p>
        <div className="mt-2 flex gap-4">
          {LANGUAGES.map((lang) => (
            <label key={lang.code} className="flex items-center gap-2 text-sm text-base-content/80">
              <input
                type="checkbox"
                checked={languages.includes(lang.code)}
                onChange={() => {
                  toggleLanguage(lang.code);
                  resetOutput();
                }}
                disabled={status === "processing"}
                className="checkbox checkbox-sm"
              />
              {lang.label}
            </label>
          ))}
        </div>
      </div>

      {status === "processing" && (
        <div className="mt-6">
          <progress className="progress progress-primary w-full" value={progress} max={100} />
          <p className="mt-1 text-center text-xs text-base-content/60">{progressLabel}</p>
        </div>
      )}

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      <div className="mt-6">
        {status === "done" && downloadUrl ? (
          <a href={downloadUrl} download="searchable.pdf" className="btn btn-primary w-full">
            <ToolIcon name="download" className="h-4 w-4" />
            Download Searchable PDF
          </a>
        ) : (
          <button
            type="button"
            onClick={handleOcr}
            disabled={!pageCount || status === "processing"}
            className="btn btn-primary w-full"
          >
            {status === "processing" ? "Processing..." : "Run OCR"}
          </button>
        )}
      </div>
      <p className="mt-2 text-center text-xs text-base-content/50">
        Recognized entirely in your browser — larger or multi-page files take longer, especially on slower devices.
      </p>
    </div>
  );
}
