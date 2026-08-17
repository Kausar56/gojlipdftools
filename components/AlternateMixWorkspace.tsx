"use client";

import { useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { SaveSuccessModal } from "./SaveSuccessModal";
import { describeError } from "@/lib/errorHelpers";

type Status = "idle" | "working" | "done" | "error";
type Order = "a-first" | "b-first";

type SlotState = {
  file: File | null;
  pageCount: number | null;
};

const emptySlot: SlotState = { file: null, pageCount: null };

export function AlternateMixWorkspace() {
  const inputRefA = useRef<HTMLInputElement>(null);
  const inputRefB = useRef<HTMLInputElement>(null);
  const [slotA, setSlotA] = useState<SlotState>(emptySlot);
  const [slotB, setSlotB] = useState<SlotState>(emptySlot);
  const [order, setOrder] = useState<Order>("a-first");
  const [reverseB, setReverseB] = useState(false);
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

  async function loadSlot(setSlot: (slot: SlotState) => void, selected: File) {
    resetOutput();
    setSlot({ file: selected, pageCount: null });
    try {
      const { PDFDocument } = await import("pdf-lib");
      const doc = await PDFDocument.load(await selected.arrayBuffer());
      setSlot({ file: selected, pageCount: doc.getPageCount() });
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, "Couldn't read this file — make sure it's a valid PDF."));
    }
  }

  async function handleMerge() {
    if (!slotA.file || !slotB.file) return;
    setStatus("working");
    setErrorMessage("");

    try {
      const { PDFDocument } = await import("pdf-lib");
      const docA = await PDFDocument.load(await slotA.file.arrayBuffer());
      const docB = await PDFDocument.load(await slotB.file.arrayBuffer());
      const outDoc = await PDFDocument.create();

      const indicesA = docA.getPageIndices();
      // Reversing book 2 before interleaving is the classic fix for scanning
      // double-sided pages as two separate stacks — the back-side stack
      // usually comes out of the scanner in reverse page order.
      const indicesB = reverseB ? [...docB.getPageIndices()].reverse() : docB.getPageIndices();

      const copiedA = await outDoc.copyPages(docA, indicesA);
      const copiedB = await outDoc.copyPages(docB, indicesB);

      const firstArr = order === "a-first" ? copiedA : copiedB;
      const secondArr = order === "a-first" ? copiedB : copiedA;
      const maxLen = Math.max(firstArr.length, secondArr.length);

      // Uneven page counts just fall through to only the longer document's
      // remaining pages once the shorter one runs out, instead of erroring.
      for (let i = 0; i < maxLen; i++) {
        if (firstArr[i]) outDoc.addPage(firstArr[i]);
        if (secondArr[i]) outDoc.addPage(secondArr[i]);
      }

      const outBytes = await outDoc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("done");
      setShowSuccessModal(true);
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, error instanceof Error ? `Couldn't combine these files: ${error.message}` : "Couldn't combine these files.",));
    }
  }

  function renderSlot(
    label: string,
    slot: SlotState,
    setSlot: (slot: SlotState) => void,
    inputRef: React.RefObject<HTMLInputElement | null>,
  ) {
    if (!slot.file) {
      return (
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const dropped = event.dataTransfer.files?.[0];
            if (dropped) loadSlot(setSlot, dropped);
          }}
          className="card flex min-h-40 flex-col items-center justify-center gap-2 py-6 text-center"
        >
          <span className="text-xs font-medium text-base-content/50">{label}</span>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ToolIcon name="upload" className="h-5 w-5" />
          </span>
          <p className="text-xs text-base-content/70">Drag & drop, or</p>
          <div className="flex">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="btn btn-primary btn-sm rounded-r-none"
            >
              Choose File
            </button>
            <UploadSourceMenu onFile={(file) => loadSlot(setSlot, file)} />
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(event) => {
              const selected = event.target.files?.[0];
              if (selected) loadSlot(setSlot, selected);
            }}
          />
        </div>
      );
    }

    return (
      <div className="card flex min-h-40 flex-col items-center justify-center gap-2 border border-base-300 bg-base-100 p-4 text-center">
        <span className="text-xs font-medium text-base-content/50">{label}</span>
        <ToolIcon name="file" className="h-6 w-6 text-primary" />
        <span className="max-w-full truncate text-sm text-base-content/80">{slot.file.name}</span>
        {slot.pageCount !== null && (
          <span className="badge badge-neutral badge-sm">{slot.pageCount} pages</span>
        )}
        <button
          type="button"
          onClick={() => {
            setSlot(emptySlot);
            resetOutput();
          }}
          className="text-xs text-base-content/50 hover:text-error"
        >
          Replace
        </button>
      </div>
    );
  }

  const bothReady = slotA.file && slotB.file;
  const uneven = slotA.pageCount !== null && slotB.pageCount !== null && slotA.pageCount !== slotB.pageCount;

  return (
    <div className="card border border-base-300 bg-base-100 p-6 shadow-sm">
      {showSuccessModal && downloadUrl && (
        <SaveSuccessModal
          downloadUrl={downloadUrl}
          downloadFileName="alternated.pdf"
          onClose={() => setShowSuccessModal(false)}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {renderSlot("Document 1", slotA, setSlotA, inputRefA)}
        {renderSlot("Document 2", slotB, setSlotB, inputRefB)}
      </div>

      {bothReady && (
        <div className="mt-5 space-y-4">
          <div>
            <p className="text-sm font-medium text-base-content">Page order</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setOrder("a-first");
                  resetOutput();
                }}
                className={`flex-1 rounded-lg border px-3 py-2 text-left text-sm transition ${
                  order === "a-first"
                    ? "border-primary bg-primary/5 text-base-content"
                    : "border-base-300 text-base-content/70 hover:border-primary/40"
                }`}
              >
                <span className="block font-medium">Doc 1, Doc 2, Doc 1, Doc 2...</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOrder("b-first");
                  resetOutput();
                }}
                className={`flex-1 rounded-lg border px-3 py-2 text-left text-sm transition ${
                  order === "b-first"
                    ? "border-primary bg-primary/5 text-base-content"
                    : "border-base-300 text-base-content/70 hover:border-primary/40"
                }`}
              >
                <span className="block font-medium">Doc 2, Doc 1, Doc 2, Doc 1...</span>
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-base-content/80">
            <input
              type="checkbox"
              checked={reverseB}
              onChange={(event) => {
                setReverseB(event.target.checked);
                resetOutput();
              }}
              className="checkbox checkbox-sm"
            />
            Reverse Document 2's page order first
            <span className="text-xs text-base-content/50">
              (use this if Document 2 is a back-side scan that came out in reverse)
            </span>
          </label>

          {uneven && (
            <p className="text-xs text-base-content/50">
              Document 1 has {slotA.pageCount} pages and Document 2 has {slotB.pageCount} — once the shorter
              one runs out, the rest of the longer document is added at the end.
            </p>
          )}
        </div>
      )}

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      <div className="mt-5">
        {status === "done" && downloadUrl ? (
          <a href={downloadUrl} download="alternated.pdf" className="btn btn-primary w-full">
            <ToolIcon name="download" className="h-4 w-4" />
            Download Combined PDF
          </a>
        ) : (
          <button
            type="button"
            onClick={handleMerge}
            disabled={!bothReady || status === "working"}
            className="btn btn-primary w-full"
          >
            {status === "working" ? "Combining..." : "Alternate & Mix"}
          </button>
        )}
      </div>
    </div>
  );
}
