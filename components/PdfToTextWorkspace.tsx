"use client";

import { useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { loadPdfjs } from "@/lib/pdfjs";
import { describeError } from "@/lib/errorHelpers";

type Status = "idle" | "working" | "done" | "error";

export function PdfToTextWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState("");

  function resetOutput() {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setPreview("");
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
      const pdfjs = await loadPdfjs();
      const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;

      const pageTexts: string[] = [];
      for (let pageIndex = 1; pageIndex <= doc.numPages; pageIndex++) {
        const page = await doc.getPage(pageIndex);
        const content = await page.getTextContent();
        const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
        pageTexts.push(text.trim());
      }

      const fullText = pageTexts.join("\n\n");
      const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setPreview(fullText.slice(0, 600));
      setStatus("done");
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, error instanceof Error ? `Couldn't extract text: ${error.message}` : "Couldn't extract text from this PDF.",));
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
          <ToolIcon name="file" className="h-4 w-4 text-secondary" />
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

      {preview && (
        <pre className="mt-4 max-h-56 overflow-auto rounded-lg bg-base-200 p-3 text-xs whitespace-pre-wrap text-base-content/70">
          {preview}
          {preview.length >= 600 ? "…" : ""}
        </pre>
      )}

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      <div className="mt-5">
        {status === "done" && downloadUrl ? (
          <a href={downloadUrl} download={`${file.name.replace(/\.pdf$/i, "")}.txt`} className="btn btn-primary w-full">
            <ToolIcon name="download" className="h-4 w-4" />
            Download Text File
          </a>
        ) : (
          <button
            type="button"
            onClick={handleExtract}
            disabled={status === "working"}
            className="btn btn-primary w-full"
          >
            {status === "working" ? "Extracting..." : "Extract Text"}
          </button>
        )}
      </div>
    </div>
  );
}
