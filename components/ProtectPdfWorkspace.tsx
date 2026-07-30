"use client";

import { useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { describeError } from "@/lib/errorHelpers";

type Status = "idle" | "working" | "done" | "error";

export function ProtectPdfWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    setPassword("");
    setConfirmPassword("");
  }

  async function handleProtect() {
    if (!file) return;
    if (!password) {
      setStatus("error");
      setErrorMessage("Enter a password.");
      return;
    }
    if (password !== confirmPassword) {
      setStatus("error");
      setErrorMessage("Passwords don't match.");
      return;
    }

    setStatus("working");
    setErrorMessage("");

    try {
      const { encryptPDF } = await import("@pdfsmaller/pdf-encrypt");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const encrypted = await encryptPDF(bytes, password);

      const blob = new Blob([encrypted as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("done");
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, error instanceof Error ? `Couldn't protect this PDF: ${error.message}` : "Couldn't protect this PDF.",));
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
          <ToolIcon name="protect-pdf" className="h-4 w-4 text-accent" />
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

      <div className="mt-5 space-y-3">
        <label className="block text-sm font-medium text-base-content">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              resetOutput();
            }}
            placeholder="Choose a password"
            className="input input-bordered mt-1.5 w-full"
          />
        </label>
        <label className="block text-sm font-medium text-base-content">
          Confirm password
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              resetOutput();
            }}
            placeholder="Type it again"
            className="input input-bordered mt-1.5 w-full"
          />
        </label>
      </div>

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      <div className="mt-5">
        {status === "done" && downloadUrl ? (
          <a href={downloadUrl} download="protected.pdf" className="btn btn-primary w-full">
            <ToolIcon name="download" className="h-4 w-4" />
            Download Protected PDF
          </a>
        ) : (
          <button
            type="button"
            onClick={handleProtect}
            disabled={status === "working"}
            className="btn btn-primary w-full"
          >
            {status === "working" ? "Protecting..." : "Protect PDF"}
          </button>
        )}
      </div>
    </div>
  );
}
