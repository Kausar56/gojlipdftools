"use client";

import { useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { SaveSuccessModal } from "./SaveSuccessModal";
import { describeError } from "@/lib/errorHelpers";

type Status = "idle" | "working" | "done" | "error";

export function UnlockPdfWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  function resetOutput() {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setStatus("idle");
    setErrorMessage("");
    setShowSuccessModal(false);
  }

  function loadFile(selected: File) {
    resetOutput();
    setFile(selected);
    setPassword("");
  }

  async function handleUnlock() {
    if (!file) return;
    if (!password) {
      setStatus("error");
      setErrorMessage("Enter the current password.");
      return;
    }

    setStatus("working");
    setErrorMessage("");

    try {
      const { decryptPDF } = await import("@pdfsmaller/pdf-decrypt");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const decrypted = await decryptPDF(bytes, password);

      const blob = new Blob([decrypted as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("done");
      setShowSuccessModal(true);
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, error instanceof Error && error.message.includes("Incorrect password")
          ? "That password doesn't match this PDF."
          : error instanceof Error
            ? error.message
            : "Couldn't unlock this PDF.",));
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
          downloadFileName="unlocked.pdf"
          onClose={() => setShowSuccessModal(false)}
        />
      )}

      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 truncate">
          <ToolIcon name="unlock-pdf" className="h-4 w-4 text-primary" />
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
        <label className="block text-sm font-medium text-base-content">
          Current password
          <input
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              resetOutput();
            }}
            placeholder="Enter the PDF's password"
            className="input input-bordered mt-1.5 w-full"
          />
        </label>
      </div>

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      <div className="mt-5">
        {status === "done" && downloadUrl ? (
          <a href={downloadUrl} download="unlocked.pdf" className="btn btn-primary w-full">
            <ToolIcon name="download" className="h-4 w-4" />
            Download Unlocked PDF
          </a>
        ) : (
          <button
            type="button"
            onClick={handleUnlock}
            disabled={status === "working"}
            className="btn btn-primary w-full"
          >
            {status === "working" ? "Unlocking..." : "Unlock PDF"}
          </button>
        )}
      </div>
    </div>
  );
}
