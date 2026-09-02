"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { loadPdfjs } from "@/lib/pdfjs";
import { describeError } from "@/lib/errorHelpers";
import { askAboutDocument, AiSummarizeError, type ChatMessage } from "@/lib/aiSummarizeClient";

type Status = "idle" | "extracting" | "ready" | "sending" | "error";

// Deliberately not Tailwind Typography's .prose — its default palette
// doesn't track daisyUI's theme variables, so text set on a colored chat
// bubble (dark theme's base-200 is near-black) could end up nearly
// unreadable. These leave color alone (inheriting the bubble's own
// text-base-content) and only add the spacing/structure markdown needs.
const markdownComponents: ComponentProps<typeof ReactMarkdown>["components"] = {
  p: ({ ...props }) => <p className="mb-2 last:mb-0" {...props} />,
  ul: ({ ...props }) => <ul className="mb-2 ml-4 list-disc space-y-1 last:mb-0" {...props} />,
  ol: ({ ...props }) => <ol className="mb-2 ml-4 list-decimal space-y-1 last:mb-0" {...props} />,
  li: ({ ...props }) => <li {...props} />,
  strong: ({ ...props }) => <strong className="font-semibold" {...props} />,
  h1: ({ ...props }) => <h3 className="mb-1 font-semibold" {...props} />,
  h2: ({ ...props }) => <h3 className="mb-1 font-semibold" {...props} />,
  h3: ({ ...props }) => <h3 className="mb-1 font-semibold" {...props} />,
  code: ({ ...props }) => <code className="rounded bg-black/10 px-1 py-0.5 text-xs" {...props} />,
  a: ({ ...props }) => <a className="underline" target="_blank" rel="noopener noreferrer" {...props} />,
  blockquote: ({ ...props }) => <blockquote className="border-l-2 border-current/30 pl-2 italic" {...props} />,
};

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await loadPdfjs();
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;

  const pageTexts: string[] = [];
  for (let pageIndex = 1; pageIndex <= doc.numPages; pageIndex++) {
    const page = await doc.getPage(pageIndex);
    const content = await page.getTextContent();
    const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
    pageTexts.push(text.trim());
  }
  return pageTexts.join("\n\n");
}

export function AiSummarizeWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [documentText, setDocumentText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");

  useEffect(() => {
    // Scroll only the chat panel itself — scrollIntoView() on an anchor
    // bubbles up to every scrollable ancestor, including the page, so a new
    // message (or the very first auto-summary) was yanking the whole page
    // down to the tool instead of just moving within the chat.
    const container = scrollContainerRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages]);

  function resetAll() {
    setFile(null);
    setDocumentText("");
    setMessages([]);
    setQuestion("");
    setStatus("idle");
    setErrorMessage("");
    setErrorCode(undefined);
  }

  async function send(history: ChatMessage[], text: string, userFacingMessage: string | null) {
    setStatus("sending");
    setErrorMessage("");
    setErrorCode(undefined);
    if (userFacingMessage) {
      setMessages([...history, { role: "user", content: userFacingMessage }]);
    }

    try {
      const reply = await askAboutDocument(text, history, userFacingMessage ?? "");
      setMessages((current) => [...current, { role: "assistant", content: reply }]);
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, error instanceof Error ? error.message : "Couldn't get a response from the AI."));
      setErrorCode(error instanceof AiSummarizeError ? error.code : undefined);
    }
  }

  async function loadFile(selected: File) {
    resetAll();
    setFile(selected);
    setStatus("extracting");
    try {
      const text = await extractPdfText(selected);
      if (!text.trim()) {
        setStatus("error");
        setErrorMessage("No readable text was found in this PDF — if it's a scanned document, run OCR first.");
        return;
      }
      setDocumentText(text);
      await send([], text, null);
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, error instanceof Error ? `Couldn't read this PDF: ${error.message}` : "Couldn't read this PDF."));
    }
  }

  function handleAsk() {
    const text = question.trim();
    if (!text || !documentText) return;
    setQuestion("");
    send(messages, documentText, text);
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
          <ToolIcon name="sparkle" className="h-6 w-6" />
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
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 truncate">
          <ToolIcon name="sparkle" className="h-4 w-4 text-primary" />
          <span className="truncate text-base-content/80">{file.name}</span>
        </span>
        <button type="button" onClick={resetAll} className="text-xs text-base-content/50 hover:text-error">
          Replace
        </button>
      </div>

      <div className="flex h-136 flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm">
        <div ref={scrollContainerRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {status === "extracting" ? (
            <p className="py-10 text-center text-sm text-base-content/40">Reading your PDF...</p>
          ) : messages.length === 0 && status === "error" ? (
            <p className="py-10 text-center text-sm text-base-content/40">Couldn&apos;t load a summary — see the error below.</p>
          ) : messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-base-content/40">Getting your summary...</p>
          ) : (
            messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-md rounded-2xl px-4 py-2 text-sm ${
                    message.role === "user"
                      ? "rounded-br-sm bg-primary text-primary-content whitespace-pre-wrap"
                      : "rounded-bl-sm bg-base-200 text-base-content"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <ReactMarkdown components={markdownComponents}>{message.content}</ReactMarkdown>
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            ))
          )}
          {status === "sending" && messages.length > 0 && (
            <div className="flex justify-start">
              <div className="max-w-md rounded-2xl rounded-bl-sm bg-base-200 px-4 py-2 text-sm text-base-content/50">
                Thinking...
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-base-300 p-3">
          {errorMessage && (
            <div className="mb-2 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
              <p>{errorMessage}</p>
              {errorCode === "AUTH_REQUIRED" && (
                <Link href="/login" className="mt-1 inline-block font-medium underline">
                  Log in
                </Link>
              )}
              {errorCode === "QUOTA_EXCEEDED" && (
                <Link href="/pricing" className="mt-1 inline-block font-medium underline">
                  View plans
                </Link>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleAsk();
                }
              }}
              placeholder="Ask a follow-up question about this document..."
              disabled={status === "extracting" || status === "sending" || !documentText}
              className="input input-bordered w-full"
            />
            <button
              type="button"
              onClick={handleAsk}
              disabled={status === "extracting" || status === "sending" || !question.trim() || !documentText}
              className="btn btn-primary shrink-0"
            >
              Ask
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
