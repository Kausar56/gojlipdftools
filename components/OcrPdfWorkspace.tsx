"use client";

import { useEffect, useRef, useState } from "react";
import type Tesseract from "tesseract.js";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { loadPdfjs } from "@/lib/pdfjs";
import { describeError } from "@/lib/errorHelpers";

type Status = "idle" | "processing" | "done" | "error";
type PageStatus = "idle" | "processing" | "done" | "error";
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

const DEFAULT_LANGUAGE: LangCode = "eng";
const THUMB_WIDTH_PX = 280;
const STRIP_THUMB_WIDTH_PX = 64;

// PDF points -> canvas pixels for the full-resolution render each page is
// recognized against — higher than the on-screen preview so OCR sees crisp
// glyphs, and also what the invisible-text layer's word boxes are measured in.
const RENDER_SCALE = 2;

function basenameWithoutExt(name: string) {
  return name.replace(/\.pdf$/i, "");
}

function downloadTextFile(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function LanguageSelect({
  value,
  onChange,
  disabled,
  className,
}: {
  value: LangCode;
  onChange: (code: LangCode) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className={`select select-bordered select-sm ${className ?? ""}`}
    >
      {LANGUAGES.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.label}
        </option>
      ))}
    </select>
  );
}

export function OcrPdfWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Each page keeps its own language choice — a scanned document can mix
  // scripts page to page, and the "recognize all" action below has its own
  // separate choice for whichever pages haven't been done individually yet.
  const [pageLanguage, setPageLanguage] = useState<LangCode[]>([]);
  const [allPagesLanguage, setAllPagesLanguage] = useState<LangCode>(DEFAULT_LANGUAGE);

  const [pageStatus, setPageStatus] = useState<PageStatus[]>([]);
  const [pageProgress, setPageProgress] = useState<number[]>([]);
  const [pageErrors, setPageErrors] = useState<string[]>([]);
  const [pageTexts, setPageTexts] = useState<(string | null)[]>([]);
  // The full Tesseract result (word boxes, not just plain text) per page —
  // kept out of state since only the searchable-PDF build step needs it, so
  // updating it shouldn't trigger a re-render on its own.
  const pageResultsRef = useRef<(Tesseract.Page | null)[]>([]);

  const [outputFormats, setOutputFormats] = useState({ pdf: true, text: true });

  const [globalStatus, setGlobalStatus] = useState<Status>("idle");
  const [globalLabel, setGlobalLabel] = useState("");
  const [globalError, setGlobalError] = useState("");
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const workerRef = useRef<Tesseract.Worker | null>(null);
  const workerLangsRef = useRef<string>("");
  const activeIndexRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  function resetPageResults(count: number) {
    pageResultsRef.current = new Array(count).fill(null);
    setPageStatus(new Array(count).fill("idle"));
    setPageProgress(new Array(count).fill(0));
    setPageErrors(new Array(count).fill(""));
    setPageTexts(new Array(count).fill(null));
    setPageLanguage(new Array(count).fill(DEFAULT_LANGUAGE));
    setCurrentPageIndex(0);
  }

  function resetOutput() {
    if (pdfDownloadUrl) URL.revokeObjectURL(pdfDownloadUrl);
    setPdfDownloadUrl(null);
    setGlobalStatus("idle");
    setGlobalLabel("");
    setGlobalError("");
  }

  async function loadFile(selected: File) {
    resetOutput();
    setFile(selected);
    setPageCount(null);
    setThumbnails([]);
    resetPageResults(0);

    try {
      const pdfjs = await loadPdfjs();
      const bytes = await selected.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: bytes }).promise;
      setPageCount(doc.numPages);
      resetPageResults(doc.numPages);

      const thumbs: string[] = [];
      for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
        const page = await doc.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: THUMB_WIDTH_PX / baseViewport.width });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        thumbs.push(canvas.toDataURL("image/jpeg", 0.85));
      }
      setThumbnails(thumbs);
    } catch (error) {
      setGlobalStatus("error");
      setGlobalError(describeError(error, "Couldn't read this file — make sure it's a valid PDF."));
    }
  }

  // Changing a page's language invalidates whatever it already recognized
  // (that text was read in the old language) — clear it so the page goes
  // back to a fresh "Recognize" state instead of showing stale text.
  function updatePageLanguage(index: number, code: LangCode) {
    setPageLanguage((prev) => prev.map((c, i) => (i === index ? code : c)));
    pageResultsRef.current[index] = null;
    setPageTexts((prev) => prev.map((t, i) => (i === index ? null : t)));
    setPageStatus((prev) => prev.map((s, i) => (i === index ? "idle" : s)));
    setPageErrors((prev) => prev.map((e, i) => (i === index ? "" : e)));
    resetOutput();
  }

  async function getWorker(langs: string) {
    const { createWorker } = await import("tesseract.js");
    if (workerRef.current && workerLangsRef.current === langs) return workerRef.current;
    if (workerRef.current) await workerRef.current.terminate();
    const worker = await createWorker(langs, undefined, {
      logger: (message) => {
        if (message.status === "recognizing text" && activeIndexRef.current !== null) {
          const idx = activeIndexRef.current;
          setPageProgress((prev) => prev.map((p, i) => (i === idx ? Math.round(message.progress * 100) : p)));
        }
      },
    });
    workerRef.current = worker;
    workerLangsRef.current = langs;
    return worker;
  }

  // Recognizes a single page in place — used both by that page's own
  // "Recognize text on this page" button (its own language) and by the "all
  // pages" bulk action below, which passes its own shared language instead.
  async function recognizePage(index: number, langOverride?: LangCode): Promise<boolean> {
    if (!file) return false;
    const lang = langOverride ?? pageLanguage[index] ?? DEFAULT_LANGUAGE;
    if (langOverride) setPageLanguage((prev) => prev.map((c, i) => (i === index ? langOverride : c)));

    setPageStatus((prev) => prev.map((s, i) => (i === index ? "processing" : s)));
    setPageProgress((prev) => prev.map((p, i) => (i === index ? 0 : p)));
    setPageErrors((prev) => prev.map((e, i) => (i === index ? "" : e)));
    activeIndexRef.current = index;

    try {
      const pdfjs = await loadPdfjs();
      const worker = await getWorker(lang);
      const bytes = await file.arrayBuffer();
      const pdfDoc = await pdfjs.getDocument({ data: bytes }).promise;
      const page = await pdfDoc.getPage(index + 1);
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas rendering isn't supported here.");
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;

      const { data } = await worker.recognize(canvas);
      pageResultsRef.current[index] = data;
      setPageTexts((prev) => prev.map((t, i) => (i === index ? data.text : t)));
      setPageStatus((prev) => prev.map((s, i) => (i === index ? "done" : s)));
      return true;
    } catch (error) {
      setPageStatus((prev) => prev.map((s, i) => (i === index ? "error" : s)));
      setPageErrors((prev) =>
        prev.map((e, i) => (i === index ? describeError(error, "Couldn't recognize text on this page.") : e)),
      );
      return false;
    } finally {
      activeIndexRef.current = null;
    }
  }

  // Builds the invisible-text searchable-PDF layer from whatever pages have
  // already been recognized (see recognizePage) — reuses that same result
  // instead of running OCR a second time just to get the same word boxes.
  async function buildSearchablePdf() {
    if (!file || !pageCount) return;
    const { PDFDocument, StandardFonts } = await import("pdf-lib");
    const bytes = await file.arrayBuffer();
    const outDoc = await PDFDocument.load(bytes);
    const font = await outDoc.embedFont(StandardFonts.Helvetica);

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
      const data = pageResultsRef.current[pageIndex];
      if (!data) continue;
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
    }

    const outBytes = await outDoc.save();
    const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
    setPdfDownloadUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(blob);
    });
  }

  async function handleRecognizeAll() {
    if (!file || !pageCount) return;
    setGlobalStatus("processing");
    setGlobalError("");

    try {
      for (let index = 0; index < pageCount; index++) {
        if (pageResultsRef.current[index]) continue; // already recognized individually
        setGlobalLabel(`Recognizing page ${index + 1} of ${pageCount}...`);
        await recognizePage(index, allPagesLanguage);
      }

      if (outputFormats.pdf) {
        setGlobalLabel("Building searchable PDF...");
        await buildSearchablePdf();
      }

      setGlobalStatus("done");
      setGlobalLabel("Done.");
    } catch (error) {
      setGlobalStatus("error");
      setGlobalError(describeError(error, "Couldn't finish running OCR on this PDF."));
    }
  }

  async function copyPageText(index: number) {
    const text = pageResultsRef.current[index]?.text ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex((current) => (current === index ? null : current)), 1500);
    } catch {
      // Clipboard permission denied or unavailable — nothing else useful to do here.
    }
  }

  function downloadPageText(index: number) {
    const text = pageResultsRef.current[index]?.text ?? "";
    const base = file ? basenameWithoutExt(file.name) : "page";
    downloadTextFile(text, `${base}-page-${index + 1}.txt`);
  }

  function downloadAllText() {
    const base = file ? basenameWithoutExt(file.name) : "document";
    const combined = pageResultsRef.current
      .map((data, i) => `--- Page ${i + 1} ---\n${(data?.text ?? "").trim()}`)
      .join("\n\n");
    downloadTextFile(combined, `${base}-ocr.txt`);
  }

  const anyPageRecognized = pageResultsRef.current.some(Boolean);
  const allPagesRecognized = pageCount !== null && pageCount > 0 && pageResultsRef.current.filter(Boolean).length === pageCount;
  const isBusy = globalStatus === "processing";

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

  const currentStatus = pageStatus[currentPageIndex];
  const currentText = pageTexts[currentPageIndex];

  return (
    <div className="card border border-base-300 bg-base-100 p-4 shadow-sm sm:p-6">
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
            setThumbnails([]);
            resetPageResults(0);
            resetOutput();
          }}
          disabled={isBusy}
          className="text-xs text-base-content/50 hover:text-error disabled:opacity-40"
        >
          Replace
        </button>
      </div>

      {/* Single-page mode: slide through pages one at a time instead of a long
          list — each page carries its own preview, language and result. */}
      {thumbnails.length === 0 ? (
        <p className="mt-6 text-center text-sm text-base-content/60">Rendering page previews...</p>
      ) : (
        <div className="mt-5">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setCurrentPageIndex((i) => Math.max(0, i - 1))}
              disabled={currentPageIndex === 0}
              className="btn btn-ghost btn-sm btn-circle"
              aria-label="Previous page"
            >
              <ToolIcon name="chevron-down" className="h-4 w-4 rotate-90" />
            </button>
            <span className="text-sm font-medium text-base-content/80">
              Page {currentPageIndex + 1} of {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPageIndex((i) => Math.min((pageCount ?? 1) - 1, i + 1))}
              disabled={currentPageIndex === (pageCount ?? 1) - 1}
              className="btn btn-ghost btn-sm btn-circle"
              aria-label="Next page"
            >
              <ToolIcon name="chevron-down" className="h-4 w-4 -rotate-90" />
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-5 rounded-lg border border-base-300 bg-base-200 p-4 sm:flex-row sm:p-5">
            <div className="flex shrink-0 flex-col items-center gap-3 sm:w-64">
              <div className="flex max-h-80 w-full items-center justify-center overflow-hidden rounded border border-base-300 bg-base-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbnails[currentPageIndex]}
                  alt={`Page ${currentPageIndex + 1}`}
                  className="max-h-80 max-w-full object-contain"
                />
              </div>
              <label className="flex w-full items-center justify-between gap-2 text-xs text-base-content/70">
                Language
                <LanguageSelect
                  value={pageLanguage[currentPageIndex] ?? DEFAULT_LANGUAGE}
                  onChange={(code) => updatePageLanguage(currentPageIndex, code)}
                  disabled={isBusy || currentStatus === "processing"}
                  className="flex-1"
                />
              </label>
            </div>

            <div className="min-w-0 flex-1">
              {currentStatus === "processing" ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 py-10">
                  <progress
                    className="progress progress-primary w-full max-w-xs"
                    value={pageProgress[currentPageIndex]}
                    max={100}
                  />
                  <span className="text-xs text-base-content/60">
                    Recognizing... {pageProgress[currentPageIndex]}%
                  </span>
                </div>
              ) : currentText !== null ? (
                <div className="flex h-full flex-col">
                  <textarea
                    readOnly
                    value={currentText ?? ""}
                    className="textarea textarea-bordered h-56 w-full resize-none text-sm"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" onClick={() => copyPageText(currentPageIndex)} className="btn btn-outline btn-sm">
                      <ToolIcon name="duplicate" className="h-3.5 w-3.5" />
                      {copiedIndex === currentPageIndex ? "Copied!" : "Copy text"}
                    </button>
                    <button type="button" onClick={() => downloadPageText(currentPageIndex)} className="btn btn-outline btn-sm">
                      <ToolIcon name="download" className="h-3.5 w-3.5" />
                      Download .txt
                    </button>
                    <button
                      type="button"
                      onClick={() => recognizePage(currentPageIndex)}
                      disabled={isBusy}
                      className="btn btn-ghost btn-sm"
                    >
                      Re-run
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center py-10">
                  <button
                    type="button"
                    onClick={() => recognizePage(currentPageIndex)}
                    disabled={isBusy}
                    className="btn btn-primary btn-sm"
                  >
                    <ToolIcon name="ocr" className="h-3.5 w-3.5" />
                    Recognize text on this page
                  </button>
                </div>
              )}
              {pageErrors[currentPageIndex] && (
                <p className="mt-2 text-xs text-error">{pageErrors[currentPageIndex]}</p>
              )}
            </div>
          </div>

          {/* Quick jump strip — scrolls horizontally on narrow screens instead
              of wrapping, so it never pushes the page wider than the viewport. */}
          {thumbnails.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {thumbnails.map((thumb, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setCurrentPageIndex(index)}
                  aria-label={`Go to page ${index + 1}`}
                  className={`relative h-16 shrink-0 overflow-hidden rounded border-2 transition-colors ${
                    index === currentPageIndex ? "border-primary" : "border-transparent hover:border-base-300"
                  }`}
                  style={{ width: STRIP_THUMB_WIDTH_PX }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumb} alt={`Page ${index + 1}`} className="h-full w-full object-cover" />
                  {pageStatus[index] === "done" && (
                    <span className="absolute right-0.5 bottom-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-success text-success-content">
                      <ToolIcon name="check" className="h-2.5 w-2.5" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* A separate, explicit option to do every page in one go — its own
          language choice (used only for pages not yet recognized above) and
          its own output-format/download controls. */}
      <div className="mt-8 rounded-lg border border-base-300 bg-base-200 p-4 sm:p-5">
        <p className="text-sm font-semibold text-base-content/80">Or recognize all pages at once</p>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-sm text-base-content/70">
            Language
            <LanguageSelect value={allPagesLanguage} onChange={setAllPagesLanguage} disabled={isBusy} />
          </label>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-medium text-base-content/70">Output:</span>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={outputFormats.pdf}
                onChange={(event) => setOutputFormats((prev) => ({ ...prev, pdf: event.target.checked }))}
                className="checkbox checkbox-sm"
              />
              Searchable PDF
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={outputFormats.text}
                onChange={(event) => setOutputFormats((prev) => ({ ...prev, text: event.target.checked }))}
                className="checkbox checkbox-sm"
              />
              Text (.txt)
            </label>
          </div>
        </div>

        <p className="mt-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-center text-xs text-base-content/70">
          OCR does not guarantee 100% accuracy. Review the results before using them.
        </p>

        {globalError && <p className="mt-3 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{globalError}</p>}
        {isBusy && <p className="mt-3 text-center text-xs text-base-content/60">{globalLabel}</p>}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleRecognizeAll}
            disabled={thumbnails.length === 0 || isBusy}
            className="btn btn-primary flex-1"
          >
            {isBusy ? "Recognizing..." : "Recognize text on all pages"}
          </button>

          {outputFormats.pdf && globalStatus === "done" && pdfDownloadUrl && (
            <a
              href={pdfDownloadUrl}
              download={`${file ? basenameWithoutExt(file.name) : "document"}-searchable.pdf`}
              className="btn btn-outline flex-1"
            >
              <ToolIcon name="download" className="h-4 w-4" />
              Download Searchable PDF
            </a>
          )}

          {outputFormats.text && allPagesRecognized && (
            <button type="button" onClick={downloadAllText} className="btn btn-outline flex-1">
              <ToolIcon name="download" className="h-4 w-4" />
              Download All Text (.txt)
            </button>
          )}
        </div>

        {anyPageRecognized && !allPagesRecognized && outputFormats.text && (
          <p className="mt-2 text-center text-xs text-base-content/50">
            Recognize the remaining pages to enable the combined .txt download.
          </p>
        )}
      </div>

      <p className="mt-3 text-center text-xs text-base-content/50">
        Recognized entirely in your browser — larger or multi-page files take longer, especially on slower devices.
      </p>
    </div>
  );
}
