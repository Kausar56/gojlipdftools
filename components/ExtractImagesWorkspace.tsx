"use client";

import { useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { describeError } from "@/lib/errorHelpers";

type Status = "idle" | "working" | "done" | "error";
type ResultItem = { label: string; filename: string; url: string };

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate"));
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

// Reconstructs an 8-bit DeviceGray/DeviceRGB raw image (the common case for a
// non-JPEG embedded image) into a real PNG. Anything more exotic — Indexed
// palettes, CMYK, JPX, CCITT fax, chained filters, <8-bit depth — is left
// alone rather than risking a corrupted/garbled decode.
async function decodeRawImageToPng(
  dict: import("pdf-lib").PDFDict,
  contents: Uint8Array,
  needsInflate: boolean,
  PDFName: typeof import("pdf-lib").PDFName,
  PDFNumber: typeof import("pdf-lib").PDFNumber,
): Promise<Blob | null> {
  const widthObj = dict.get(PDFName.of("Width"));
  const heightObj = dict.get(PDFName.of("Height"));
  if (!(widthObj instanceof PDFNumber) || !(heightObj instanceof PDFNumber)) return null;
  const width = widthObj.asNumber();
  const height = heightObj.asNumber();

  const bpcObj = dict.get(PDFName.of("BitsPerComponent"));
  const bpc = bpcObj instanceof PDFNumber ? bpcObj.asNumber() : 8;
  if (bpc !== 8) return null;

  const csObj = dict.get(PDFName.of("ColorSpace"));
  const csName = csObj?.toString();
  const channels = csName === "/DeviceGray" ? 1 : csName === "/DeviceRGB" ? 3 : null;
  if (!channels) return null;

  const raw = needsInflate ? await inflate(contents) : contents;
  if (raw.length < width * height * channels) return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const imageData = ctx.createImageData(width, height);
  for (let i = 0; i < width * height; i++) {
    if (channels === 1) {
      const v = raw[i];
      imageData.data[i * 4] = v;
      imageData.data[i * 4 + 1] = v;
      imageData.data[i * 4 + 2] = v;
    } else {
      imageData.data[i * 4] = raw[i * 3];
      imageData.data[i * 4 + 1] = raw[i * 3 + 1];
      imageData.data[i * 4 + 2] = raw[i * 3 + 2];
    }
    imageData.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}

export function ExtractImagesWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [unsupportedCount, setUnsupportedCount] = useState(0);
  const [results, setResults] = useState<ResultItem[]>([]);

  function resetOutput() {
    setResults((prev) => {
      prev.forEach((result) => URL.revokeObjectURL(result.url));
      return [];
    });
    setUnsupportedCount(0);
    setStatus("idle");
    setErrorMessage("");
  }

  function loadFile(selected: File) {
    resetOutput();
    setFile(selected);
  }

  async function handleExtract() {
    if (!file) return;
    setStatus("working");
    setErrorMessage("");

    try {
      const { PDFDocument, PDFName, PDFDict, PDFRawStream, PDFRef, PDFNumber } = await import("pdf-lib");
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);

      const seen = new Set<string>();
      const outputs: ResultItem[] = [];
      let skipped = 0;
      let imageIndex = 0;

      for (const page of doc.getPages()) {
        const resources = page.node.Resources();
        if (!resources) continue;
        const xObjects = resources.lookup(PDFName.of("XObject"));
        if (!(xObjects instanceof PDFDict)) continue;

        for (const [, ref] of xObjects.entries()) {
          if (!(ref instanceof PDFRef)) continue;
          const key = ref.toString();
          if (seen.has(key)) continue;
          seen.add(key);

          const xObject = doc.context.lookup(ref);
          if (!(xObject instanceof PDFRawStream)) continue;
          const subtype = xObject.dict.get(PDFName.of("Subtype"));
          if (!subtype || subtype.toString() !== "/Image") continue;

          imageIndex += 1;
          const filter = xObject.dict.get(PDFName.of("Filter"));
          const filterName = filter?.toString();

          if (filterName === "/DCTDecode") {
            const blob = new Blob([xObject.getContents() as BlobPart], { type: "image/jpeg" });
            const url = URL.createObjectURL(blob);
            outputs.push({ label: `Image ${imageIndex}`, filename: `image-${imageIndex}.jpg`, url });
            continue;
          }

          if ((filterName === "/FlateDecode" || !filter) && typeof DecompressionStream !== "undefined") {
            try {
              const png = await decodeRawImageToPng(
                xObject.dict,
                xObject.getContents(),
                filterName === "/FlateDecode",
                PDFName,
                PDFNumber,
              );
              if (png) {
                const url = URL.createObjectURL(png);
                outputs.push({ label: `Image ${imageIndex}`, filename: `image-${imageIndex}.png`, url });
                continue;
              }
            } catch {
              // Fall through to "unsupported" below.
            }
          }

          skipped += 1;
        }
      }

      setResults(outputs);
      setUnsupportedCount(skipped);
      setStatus("done");
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, error instanceof Error ? `Couldn't extract images: ${error.message}` : "Couldn't extract images from this PDF.",));
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

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      {status === "done" && (
        <p className="mt-4 text-sm text-base-content/70">
          {results.length === 0
            ? "No images could be extracted from this PDF."
            : `Extracted ${results.length} image${results.length === 1 ? "" : "s"}.`}
          {unsupportedCount > 0 &&
            ` ${unsupportedCount} image${unsupportedCount === 1 ? "" : "s"} used an unsupported encoding and couldn't be extracted.`}
        </p>
      )}

      {results.length > 0 && (
        <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">
          {results.map((result) => (
            <li
              key={result.filename}
              className="flex items-center justify-between gap-3 rounded-lg border border-base-300 px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2 truncate">
                <img src={result.url} alt={result.label} className="h-8 w-8 rounded object-cover" />
                <span className="text-base-content/80">{result.label}</span>
              </span>
              <a href={result.url} download={result.filename} className="btn btn-primary btn-xs shrink-0">
                <ToolIcon name="download" className="h-3.5 w-3.5" />
                Download
              </a>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={handleExtract}
        disabled={status === "working"}
        className="btn btn-primary mt-5 w-full"
      >
        {status === "working" ? "Extracting..." : "Extract Images"}
      </button>
    </div>
  );
}
