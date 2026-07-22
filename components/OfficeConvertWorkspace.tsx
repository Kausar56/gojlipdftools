"use client";

import { useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { convertViaCloudConvert } from "@/lib/convertClient";

type Status = "idle" | "working" | "done" | "error";

export function OfficeConvertWorkspace({
  inputFormat,
  outputFormat,
  accept,
  icon,
  actionLabel,
}: {
  inputFormat: string;
  outputFormat: string;
  accept: string;
  icon: string;
  actionLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<{ downloadUrl: string; filename: string } | null>(null);

  function resetOutput() {
    setResult(null);
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
      const converted = await convertViaCloudConvert(file, inputFormat, outputFormat, setStatusMessage);
      setResult(converted);
      setStatus("done");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Couldn't convert this file.");
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
        <p className="text-sm text-base-content/70">Drag & drop a file here, or</p>
        <button type="button" onClick={() => inputRef.current?.click()} className="btn btn-primary btn-md">
          Choose File
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => {
            const selected = event.target.files?.[0];
            if (selected) loadFile(selected);
          }}
        />
        <p className="mt-2 max-w-sm text-xs text-base-content/50">
          Unlike most tools on this site, this one uses{" "}
          <a href="https://cloudconvert.com" target="_blank" rel="noopener noreferrer" className="underline">
            CloudConvert
          </a>{" "}
          — your file is uploaded to their servers to perform the conversion, then removed.
        </p>
      </div>
    );
  }

  return (
    <div className="card border border-base-300 bg-base-100 p-6 shadow-sm">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 truncate">
          <ToolIcon name={icon} className="h-4 w-4 text-primary" />
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

      <p className="mt-3 text-xs text-base-content/50">
        Uses{" "}
        <a href="https://cloudconvert.com" target="_blank" rel="noopener noreferrer" className="underline">
          CloudConvert
        </a>{" "}
        — your file is uploaded to their servers for this conversion, then removed.
      </p>

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      <div className="mt-5">
        {status === "done" && result ? (
          <a
            href={result.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary w-full"
          >
            <ToolIcon name="download" className="h-4 w-4" />
            Download {result.filename}
          </a>
        ) : (
          <button
            type="button"
            onClick={handleConvert}
            disabled={status === "working"}
            className="btn btn-primary w-full"
          >
            {status === "working" ? statusMessage || "Converting..." : actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
