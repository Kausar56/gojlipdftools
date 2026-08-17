"use client";

import { useRef, useState } from "react";
import type { PDFRef } from "pdf-lib";
import Link from "next/link";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { SaveSuccessModal } from "./SaveSuccessModal";
import { formatBytes } from "@/lib/format";
import { describeError } from "@/lib/errorHelpers";
import { ConvertError, optimizePdfViaCloudConvert, type OptimizeProfile } from "@/lib/convertClient";

type Level = "low" | "recommended" | "extreme";
type Mode = "standard" | "advanced";
type Status = "idle" | "compressing" | "done" | "error";

const levels: {
  id: Level;
  label: string;
  description: string;
  quality: number;
  targetDpi: number | null;
  profile: OptimizeProfile;
}[] = [
  { id: "low", label: "Low compression", description: "Best quality", quality: 0.8, targetDpi: null, profile: "print" },
  { id: "recommended", label: "Recommended", description: "Good balance", quality: 0.6, targetDpi: 150, profile: "web" },
  { id: "extreme", label: "Extreme compression", description: "Smallest file", quality: 0.4, targetDpi: 100, profile: "max" },
];

export function CompressPdfWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<Level>("recommended");
  // Standard runs entirely in the browser (free, private, image-recompression
  // only). Advanced sends the file to CloudConvert for a real Ghostscript-
  // level optimization pass — costs a conversion credit, so it requires login.
  const [mode, setMode] = useState<Mode>("standard");
  const [status, setStatus] = useState<Status>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFilename, setDownloadFilename] = useState("compressed.pdf");
  const [resultSize, setResultSize] = useState<number | null>(null);
  const [lowSavings, setLowSavings] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  function resetOutput() {
    if (downloadUrl && downloadUrl.startsWith("blob:")) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setDownloadFilename("compressed.pdf");
    setResultSize(null);
    setLowSavings(false);
    setStatus("idle");
    setStatusMessage("");
    setErrorMessage("");
    setErrorCode(undefined);
    setShowSuccessModal(false);
  }

  function loadFile(selected: File) {
    resetOutput();
    setFile(selected);
  }

  async function handleCompress() {
    if (!file) return;
    setStatus("compressing");
    setErrorMessage("");
    setErrorCode(undefined);

    if (mode === "advanced") {
      try {
        const { profile } = levels.find((item) => item.id === level)!;
        const result = await optimizePdfViaCloudConvert(file, profile, setStatusMessage);
        setDownloadUrl(result.downloadUrl);
        setDownloadFilename(result.filename);
        if (result.sizeBytes !== null) {
          setResultSize(result.sizeBytes);
          setLowSavings(result.sizeBytes > file.size * 0.95);
        }
        setStatus("done");
        setShowSuccessModal(true);
      } catch (error) {
        setStatus("error");
        setErrorMessage(describeError(error, error instanceof Error ? error.message : "Couldn't compress this PDF."));
        setErrorCode(error instanceof ConvertError ? error.code : undefined);
      }
      return;
    }

    try {
      const { PDFDocument, PDFName, PDFDict, PDFRawStream, PDFRef } = await import("pdf-lib");
      const { quality, targetDpi } = levels.find((item) => item.id === level)!;
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);

      // Multiple pages can share the same underlying image object — recompress each
      // unique image only once and reuse the result, instead of duplicating it per page.
      const recompressed = new Map<string, PDFRef>();

      for (const page of doc.getPages()) {
        const resources = page.node.Resources();
        if (!resources) continue;
        const xObjects = resources.lookup(PDFName.of("XObject"));
        if (!(xObjects instanceof PDFDict)) continue;

        // Used to cap image pixel dimensions to a target DPI. Since PDF images are
        // always scaled to fill whatever box the page's content stream draws them
        // into, shrinking the source pixels doesn't change how large the image
        // appears on the page — it only reduces the pixel density behind it.
        const { width: pageWidthPt, height: pageHeightPt } = page.getSize();
        const maxWidthPx = targetDpi ? Math.max(1, Math.round((pageWidthPt / 72) * targetDpi)) : Infinity;
        const maxHeightPx = targetDpi ? Math.max(1, Math.round((pageHeightPt / 72) * targetDpi)) : Infinity;

        for (const [key, ref] of xObjects.entries()) {
          if (!(ref instanceof PDFRef)) continue;
          const refKey = ref.toString();

          if (recompressed.has(refKey)) {
            xObjects.set(key, recompressed.get(refKey)!);
            continue;
          }

          const xObject = doc.context.lookup(ref);
          if (!(xObject instanceof PDFRawStream)) continue;

          const subtype = xObject.dict.get(PDFName.of("Subtype"));
          if (!subtype || subtype.toString() !== "/Image") continue;

          const filter = xObject.dict.get(PDFName.of("Filter"));
          if (!filter || filter.toString() !== "/DCTDecode") continue;

          try {
            const original = xObject.getContents();
            const blob = new Blob([original as BlobPart], { type: "image/jpeg" });
            const bitmap = await createImageBitmap(blob);

            // Never upscale — only shrink pixel dimensions that exceed the DPI cap.
            const scale = Math.min(1, maxWidthPx / bitmap.width, maxHeightPx / bitmap.height);
            const targetWidth = Math.max(1, Math.round(bitmap.width * scale));
            const targetHeight = Math.max(1, Math.round(bitmap.height * scale));

            const canvas = document.createElement("canvas");
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext("2d");
            if (!ctx) continue;
            ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

            const newBlob: Blob | null = await new Promise((resolve) =>
              canvas.toBlob(resolve, "image/jpeg", quality),
            );
            if (!newBlob) continue;

            const newBytes = new Uint8Array(await newBlob.arrayBuffer());
            if (newBytes.length < original.length) {
              const newImage = await doc.embedJpg(newBytes);
              xObjects.set(key, newImage.ref);
              recompressed.set(refKey, newImage.ref);
              // Drop the original image object — pdf-lib doesn't garbage-collect
              // orphaned objects on save, so leaving it in place would grow the file.
              doc.context.delete(ref);
            } else {
              recompressed.set(refKey, ref);
            }
          } catch {
            // This image couldn't be decoded/recompressed — leave it untouched.
            recompressed.set(refKey, ref);
          }
        }
      }

      const outBytes = await doc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setResultSize(outBytes.length);
      setLowSavings(outBytes.length > file.size * 0.95);
      setStatus("done");
      setShowSuccessModal(true);
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, error instanceof Error
          ? `Couldn't compress this PDF: ${error.message}`
          : "Couldn't compress this PDF.",));
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
      {showSuccessModal && downloadUrl && (
        <SaveSuccessModal
          downloadUrl={downloadUrl}
          downloadFileName={downloadFilename}
          onClose={() => setShowSuccessModal(false)}
          recommendedSlugs={["merge-pdf", "protect-pdf", "watermark-pdf", "split-pdf"]}
        />
      )}

      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 truncate">
          <ToolIcon name="compress" className="h-4 w-4 text-accent" />
          <span className="truncate text-base-content/80">{file.name}</span>
          <span className="badge badge-neutral badge-sm">{formatBytes(file.size)}</span>
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

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setMode("standard");
            resetOutput();
          }}
          className={`flex-1 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
            mode === "standard"
              ? "border-primary bg-primary/5 text-base-content"
              : "border-base-300 text-base-content/70 hover:border-primary/40"
          }`}
        >
          <span className="block font-medium">Standard</span>
          <span className="block text-xs text-base-content/50">Free, runs in your browser</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("advanced");
            resetOutput();
          }}
          className={`flex-1 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
            mode === "advanced"
              ? "border-primary bg-primary/5 text-base-content"
              : "border-base-300 text-base-content/70 hover:border-primary/40"
          }`}
        >
          <span className="block font-medium">Advanced</span>
          <span className="block text-xs text-base-content/50">Stronger compression, requires login</span>
        </button>
      </div>

      {mode === "advanced" && (
        <p className="mt-3 text-xs text-base-content/50">
          Uses{" "}
          <a href="https://cloudconvert.com" target="_blank" rel="noopener noreferrer" className="underline">
            CloudConvert
          </a>{" "}
          — your file is uploaded to their servers for this compression, then removed.
        </p>
      )}

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        {levels.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setLevel(item.id);
              resetOutput();
            }}
            className={`rounded-lg border px-3 py-2.5 text-left text-sm transition ${
              level === item.id
                ? "border-primary bg-primary/5 text-base-content"
                : "border-base-300 text-base-content/70 hover:border-primary/40"
            }`}
          >
            <span className="block font-medium">{item.label}</span>
            <span className="block text-xs text-base-content/50">{item.description}</span>
          </button>
        ))}
      </div>

      {status === "done" && resultSize !== null && (
        <div className="mt-5 rounded-lg border border-base-300 bg-base-200 px-4 py-3 text-sm">
          <p className="text-base-content/80">
            {formatBytes(file.size)} → <span className="font-semibold text-base-content">{formatBytes(resultSize)}</span>
            {resultSize < file.size && (
              <span className="ml-1 text-secondary">
                ({Math.round((1 - resultSize / file.size) * 100)}% smaller)
              </span>
            )}
          </p>
          {lowSavings && (
            <p className="mt-1 text-xs text-base-content/50">
              This PDF didn&apos;t shrink much — it may not contain compressible images.
            </p>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
          <p>{errorMessage}</p>
          {errorCode === "AUTH_REQUIRED" && (
            <Link href="/login" className="mt-1 inline-block font-medium underline">
              Log in
            </Link>
          )}
          {(errorCode === "QUOTA_EXCEEDED" || errorCode === "FILE_TOO_LARGE") && (
            <Link href="/pricing" className="mt-1 inline-block font-medium underline">
              View plans
            </Link>
          )}
        </div>
      )}

      <div className="mt-5">
        {status === "done" && downloadUrl ? (
          mode === "advanced" ? (
            <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full">
              <ToolIcon name="download" className="h-4 w-4" />
              Download {downloadFilename}
            </a>
          ) : (
            <a href={downloadUrl} download={downloadFilename} className="btn btn-primary w-full">
              <ToolIcon name="download" className="h-4 w-4" />
              Download Compressed PDF
            </a>
          )
        ) : (
          <button
            type="button"
            onClick={handleCompress}
            disabled={status === "compressing"}
            className="btn btn-primary w-full"
          >
            {status === "compressing" ? statusMessage || "Compressing..." : "Compress PDF"}
          </button>
        )}
      </div>
    </div>
  );
}
