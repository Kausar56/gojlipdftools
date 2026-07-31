"use client";

import { useEffect, useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { loadPdfjs } from "@/lib/pdfjs";
import { describeError } from "@/lib/errorHelpers";

type Status = "idle" | "processing" | "done" | "error";
type LangCode = string;

// Tesseract's full trained-data language set (tessdata_fast, what tesseract.js
// fetches from its CDN) — not just a couple of hardcoded options, so any
// supported script/language can be picked.
const LANGUAGES: { code: LangCode; label: string }[] = [
  { code: "afr", label: "Afrikaans" },
  { code: "amh", label: "Amharic" },
  { code: "ara", label: "Arabic" },
  { code: "asm", label: "Assamese" },
  { code: "aze", label: "Azerbaijani" },
  { code: "aze_cyrl", label: "Azerbaijani (Cyrillic)" },
  { code: "bel", label: "Belarusian" },
  { code: "ben", label: "Bengali" },
  { code: "bod", label: "Tibetan" },
  { code: "bos", label: "Bosnian" },
  { code: "bul", label: "Bulgarian" },
  { code: "cat", label: "Catalan" },
  { code: "ceb", label: "Cebuano" },
  { code: "ces", label: "Czech" },
  { code: "chi_sim", label: "Chinese (Simplified)" },
  { code: "chi_tra", label: "Chinese (Traditional)" },
  { code: "chr", label: "Cherokee" },
  { code: "cym", label: "Welsh" },
  { code: "dan", label: "Danish" },
  { code: "deu", label: "German" },
  { code: "dzo", label: "Dzongkha" },
  { code: "ell", label: "Greek" },
  { code: "eng", label: "English" },
  { code: "enm", label: "English, Middle (1100-1500)" },
  { code: "epo", label: "Esperanto" },
  { code: "est", label: "Estonian" },
  { code: "eus", label: "Basque" },
  { code: "fas", label: "Persian" },
  { code: "fin", label: "Finnish" },
  { code: "fra", label: "French" },
  { code: "frk", label: "Frankish" },
  { code: "frm", label: "French, Middle (1400-1600)" },
  { code: "gle", label: "Irish" },
  { code: "glg", label: "Galician" },
  { code: "grc", label: "Greek, Ancient (to 1453)" },
  { code: "guj", label: "Gujarati" },
  { code: "hat", label: "Haitian Creole" },
  { code: "heb", label: "Hebrew" },
  { code: "hin", label: "Hindi" },
  { code: "hrv", label: "Croatian" },
  { code: "hun", label: "Hungarian" },
  { code: "iku", label: "Inuktitut" },
  { code: "ind", label: "Indonesian" },
  { code: "isl", label: "Icelandic" },
  { code: "ita", label: "Italian" },
  { code: "ita_old", label: "Italian (Old)" },
  { code: "jav", label: "Javanese" },
  { code: "jpn", label: "Japanese" },
  { code: "kan", label: "Kannada" },
  { code: "kat", label: "Georgian" },
  { code: "kat_old", label: "Georgian (Old)" },
  { code: "kaz", label: "Kazakh" },
  { code: "khm", label: "Khmer" },
  { code: "kir", label: "Kyrgyz" },
  { code: "kor", label: "Korean" },
  { code: "kur", label: "Kurdish" },
  { code: "lao", label: "Lao" },
  { code: "lat", label: "Latin" },
  { code: "lav", label: "Latvian" },
  { code: "lit", label: "Lithuanian" },
  { code: "mal", label: "Malayalam" },
  { code: "mar", label: "Marathi" },
  { code: "mkd", label: "Macedonian" },
  { code: "mlt", label: "Maltese" },
  { code: "mon", label: "Mongolian" },
  { code: "mri", label: "Maori" },
  { code: "msa", label: "Malay" },
  { code: "mya", label: "Burmese" },
  { code: "nep", label: "Nepali" },
  { code: "nld", label: "Dutch" },
  { code: "nor", label: "Norwegian" },
  { code: "oci", label: "Occitan" },
  { code: "ori", label: "Oriya" },
  { code: "pan", label: "Punjabi" },
  { code: "pol", label: "Polish" },
  { code: "por", label: "Portuguese" },
  { code: "pus", label: "Pashto" },
  { code: "ron", label: "Romanian" },
  { code: "rus", label: "Russian" },
  { code: "san", label: "Sanskrit" },
  { code: "sin", label: "Sinhala" },
  { code: "slk", label: "Slovak" },
  { code: "slv", label: "Slovenian" },
  { code: "spa", label: "Spanish" },
  { code: "sqi", label: "Albanian" },
  { code: "srp", label: "Serbian" },
  { code: "srp_latn", label: "Serbian (Latin)" },
  { code: "swa", label: "Swahili" },
  { code: "swe", label: "Swedish" },
  { code: "syr", label: "Syriac" },
  { code: "tam", label: "Tamil" },
  { code: "tel", label: "Telugu" },
  { code: "tgk", label: "Tajik" },
  { code: "tgl", label: "Tagalog" },
  { code: "tha", label: "Thai" },
  { code: "tir", label: "Tigrinya" },
  { code: "tur", label: "Turkish" },
  { code: "uig", label: "Uyghur" },
  { code: "ukr", label: "Ukrainian" },
  { code: "urd", label: "Urdu" },
  { code: "uzb", label: "Uzbek" },
  { code: "uzb_cyrl", label: "Uzbek (Cyrillic)" },
  { code: "vie", label: "Vietnamese" },
  { code: "yid", label: "Yiddish" },
].sort((a, b) => a.label.localeCompare(b.label));

const PREVIEW_WIDTH_PX = 360;

// PDF points -> canvas pixels for the page render each word's bbox is measured
// against — must match the `scale` passed to page.getViewport below.
const RENDER_SCALE = 2;

export function OcrPdfWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [previewPageIndex, setPreviewPageIndex] = useState(0);
  const [languages, setLanguages] = useState<LangCode[]>(["eng"]);
  const [langSearch, setLangSearch] = useState("");
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
    setPreviewPageIndex(0);
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

  // Renders whichever page is selected for preview, so the user can confirm
  // it's the right document (and see which pages need OCR) before running it
  // — OCR itself never touches how the page looks, so this is just a plain
  // viewer, not an interactive/positioned preview like other tools.
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
      } catch {
        // Preview render failed (e.g. an unusual PDF structure) — OCR itself
        // still works, just without a page preview.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, pageCount, previewPageIndex]);

  function toggleLanguage(code: LangCode) {
    setLanguages((prev) => {
      const next = prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code];
      return next.length > 0 ? next : prev; // never allow zero languages selected
    });
  }

  const filteredLanguages = langSearch.trim()
    ? LANGUAGES.filter((lang) => lang.label.toLowerCase().includes(langSearch.trim().toLowerCase()))
    : LANGUAGES;

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

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <div className="flex flex-col items-center gap-2 lg:flex-3">
          <div className="overflow-hidden rounded-sm border border-base-300 bg-base-200 shadow-sm">
            <canvas ref={previewCanvasRef} className="block max-w-full" />
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

        <div className="lg:flex-2">
          <p className="text-sm font-medium text-base-content/80">Language</p>

          {languages.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {languages.map((code) => {
                const lang = LANGUAGES.find((l) => l.code === code);
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      toggleLanguage(code);
                      resetOutput();
                    }}
                    disabled={status === "processing"}
                    className="badge badge-primary gap-1"
                  >
                    {lang?.label ?? code}
                    <ToolIcon name="close" className="h-3 w-3" />
                  </button>
                );
              })}
            </div>
          )}

          <input
            type="text"
            value={langSearch}
            onChange={(event) => setLangSearch(event.target.value)}
            placeholder="Search languages..."
            disabled={status === "processing"}
            className="input input-bordered input-sm mt-2 w-full"
          />

          <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-base-300">
            {filteredLanguages.length === 0 ? (
              <p className="p-3 text-center text-xs text-base-content/50">No languages match.</p>
            ) : (
              <ul className="divide-y divide-base-200">
                {filteredLanguages.map((lang) => (
                  <li key={lang.code}>
                    <label className="flex items-center gap-2 px-3 py-1.5 text-sm text-base-content/80 hover:bg-base-200">
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
                  </li>
                ))}
              </ul>
            )}
          </div>
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
