"use client";

import { useState } from "react";
import Link from "next/link";
import { ToolIcon } from "./icons";
import { OfficeConvertWorkspace } from "./OfficeConvertWorkspace";
import { ConvertError, captureUrlToPdf } from "@/lib/convertClient";
import { describeError } from "@/lib/errorHelpers";

type Mode = "url" | "file";
type Status = "idle" | "working" | "done" | "error";

export function HtmlToPdfWorkspace() {
  const [mode, setMode] = useState<Mode>("url");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<{ downloadUrl: string; filename: string } | null>(null);

  function resetOutput() {
    setResult(null);
    setStatus("idle");
    setErrorMessage("");
    setErrorCode(undefined);
  }

  async function handleCapture() {
    if (!url.trim()) return;
    setStatus("working");
    setErrorMessage("");
    setErrorCode(undefined);

    try {
      const converted = await captureUrlToPdf(url.trim(), setStatusMessage);
      setResult(converted);
      setStatus("done");
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, error instanceof Error ? error.message : "Couldn't convert this page."));
      setErrorCode(error instanceof ConvertError ? error.code : undefined);
    }
  }

  return (
    <div className="card border border-base-300 bg-base-100 p-6 shadow-sm">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setMode("url");
            resetOutput();
          }}
          className={`flex-1 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
            mode === "url"
              ? "border-primary bg-primary/5 text-base-content"
              : "border-base-300 text-base-content/70 hover:border-primary/40"
          }`}
        >
          <span className="block font-medium">From a URL</span>
          <span className="block text-xs text-base-content/50">Turn a live web page into a PDF</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("file");
            resetOutput();
          }}
          className={`flex-1 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
            mode === "file"
              ? "border-primary bg-primary/5 text-base-content"
              : "border-base-300 text-base-content/70 hover:border-primary/40"
          }`}
        >
          <span className="block font-medium">From an HTML file</span>
          <span className="block text-xs text-base-content/50">Convert a saved .html file</span>
        </button>
      </div>

      {mode === "file" ? (
        <div className="mt-5">
          <OfficeConvertWorkspace
            inputFormat="html"
            outputFormat="pdf"
            accept=".html,.htm,text/html"
            icon="file"
            actionLabel="Convert to PDF"
          />
        </div>
      ) : (
        <div className="mt-5">
          <label className="block text-sm font-medium text-base-content">
            Web page URL
            <input
              type="url"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                resetOutput();
              }}
              placeholder="https://example.com"
              className="input input-bordered mt-1.5 w-full"
            />
          </label>

          <p className="mt-3 text-xs text-base-content/50">
            Uses{" "}
            <a href="https://cloudconvert.com" target="_blank" rel="noopener noreferrer" className="underline">
              CloudConvert
            </a>{" "}
            to render the page in a real browser on their servers — the page's own server just sees a normal
            visit, so anything behind a login or paywall won't come through.
          </p>

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
                onClick={handleCapture}
                disabled={!url.trim() || status === "working"}
                className="btn btn-primary w-full"
              >
                {status === "working" ? statusMessage || "Converting..." : "Convert to PDF"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
