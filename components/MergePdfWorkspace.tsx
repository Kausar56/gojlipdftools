"use client";

import { useEffect, useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { SaveSuccessModal } from "./SaveSuccessModal";
import { describeError } from "@/lib/errorHelpers";

type FileItem = {
  id: string;
  file: File;
  needsPassword: boolean;
  password: string;
  passwordError: string | null;
};

type Status = "idle" | "merging" | "done" | "error";

// Thrown only for the specific, already-diagnosed case of "this exact file
// couldn't be parsed as a PDF" — kept distinct from unexpected pdf-lib
// errors so the catch block below can show its message as-is (it's already
// user-facing) instead of falling back to a generic message.
class UnreadablePdfError extends Error {}

export function MergePdfWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<FileItem[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  function resetOutput() {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setStatus("idle");
    setErrorMessage("");
    setShowSuccessModal(false);
  }

  function isPdfFile(file: File): boolean {
    return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  }

  function addFiles(fileList: FileList | File[] | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const pdfFiles = files.filter(isPdfFile);
    const rejected = files.filter((file) => !isPdfFile(file));

    if (pdfFiles.length > 0) {
      const next = pdfFiles.map((file) => ({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
        file,
        needsPassword: false,
        password: "",
        passwordError: null,
      }));
      setItems((prev) => [...prev, ...next]);
    }

    resetOutput();
    if (rejected.length > 0) {
      setErrorMessage(
        rejected.length === 1
          ? `"${rejected[0].name}" isn't a PDF — only PDF files are supported.`
          : `${rejected.length} of the selected files aren't PDFs — only PDF files are supported.`,
      );
    }
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
    resetOutput();
  }

  function setItemPassword(id: string, password: string) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, password, passwordError: null } : item)));
    resetOutput();
  }

  function moveItem(index: number, direction: -1 | 1) {
    setItems((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    resetOutput();
  }

  // Drag-to-reorder via Pointer Events (not native HTML5 drag-and-drop, which
  // has no touch support at all) — hit-tests the pointer position against
  // every other row's live bounding rect to find what it's currently over.
  function startDrag(id: string, event: React.PointerEvent) {
    event.preventDefault();
    setDraggingId(id);

    function onMove(moveEvent: PointerEvent) {
      let overId: string | null = null;
      for (const [otherId, el] of itemRefs.current.entries()) {
        const rect = el.getBoundingClientRect();
        if (
          moveEvent.clientX >= rect.left &&
          moveEvent.clientX <= rect.right &&
          moveEvent.clientY >= rect.top &&
          moveEvent.clientY <= rect.bottom
        ) {
          overId = otherId;
          break;
        }
      }
      if (!overId || overId === id) return;

      setItems((prev) => {
        const currentIndex = prev.findIndex((item) => item.id === id);
        const targetIndex = prev.findIndex((item) => item.id === overId);
        if (currentIndex === -1 || targetIndex === -1 || currentIndex === targetIndex) return prev;
        const next = [...prev];
        const [moved] = next.splice(currentIndex, 1);
        next.splice(targetIndex, 0, moved);
        return next;
      });
    }

    function onUp() {
      setDraggingId(null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    resetOutput();
  }

  async function handleMerge() {
    if (items.length < 2) return;
    setStatus("merging");
    setErrorMessage("");

    // Filled in as files are found to be password-protected — either
    // discovered for the first time, or because the password typed in for
    // them turned out to be wrong. Either way the merge is aborted and the
    // user gets an inline password field for each one instead of it silently
    // merging garbage or throwing a raw pdf-lib error.
    const lockedIds = new Set<string>();
    const passwordErrors = new Map<string, string>();

    try {
      const { PDFDocument, EncryptedPDFError } = await import("pdf-lib");
      const mergedPdf = await PDFDocument.create();
      const sourceDocs: Array<Awaited<ReturnType<typeof PDFDocument.load>>> = [];

      for (const item of items) {
        const bytes = new Uint8Array(await item.file.arrayBuffer());
        let sourceBytes: Uint8Array = bytes;

        if (item.needsPassword || item.password) {
          if (!item.password) {
            lockedIds.add(item.id);
            continue;
          }
          try {
            const { decryptPDF } = await import("@pdfsmaller/pdf-decrypt");
            sourceBytes = await decryptPDF(bytes, item.password);
          } catch (err) {
            passwordErrors.set(
              item.id,
              err instanceof Error && err.message.includes("Incorrect password")
                ? "Incorrect password."
                : "Couldn't unlock this file with that password.",
            );
            continue;
          }
        }

        try {
          sourceDocs.push(await PDFDocument.load(sourceBytes));
        } catch (err) {
          if (err instanceof EncryptedPDFError) {
            lockedIds.add(item.id);
          } else {
            throw new UnreadablePdfError(`"${item.file.name}" is corrupted or unreadable.`);
          }
        }
      }

      if (lockedIds.size > 0 || passwordErrors.size > 0) {
        setItems((prev) =>
          prev.map((item) => {
            if (lockedIds.has(item.id)) return { ...item, needsPassword: true, passwordError: null };
            if (passwordErrors.has(item.id)) {
              return { ...item, needsPassword: true, passwordError: passwordErrors.get(item.id)! };
            }
            return item;
          }),
        );
        setStatus("error");
        setErrorMessage(
          "One or more files are password-protected. Enter the password for each below, then merge again.",
        );
        return;
      }

      for (const sourcePdf of sourceDocs) {
        const copiedPages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("done");
      setShowSuccessModal(true);
    } catch (error) {
      setStatus("error");
      if (error instanceof UnreadablePdfError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(describeError(error, "Couldn't merge these files. Make sure they're all valid PDFs."));
      }
    }
  }

  return (
    <div className="card p-6">
      {showSuccessModal && downloadUrl && (
        <SaveSuccessModal
          downloadUrl={downloadUrl}
          downloadFileName="merged.pdf"
          onClose={() => setShowSuccessModal(false)}
          recommendedSlugs={["compress-pdf", "protect-pdf", "split-pdf", "organize"]}
        />
      )}

      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          addFiles(event.dataTransfer.files);
        }}
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl px-6 py-8 text-center"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ToolIcon name="upload" className="h-6 w-6" />
        </span>
        <p className="text-sm text-base-content/70">Drag & drop PDF files here, or</p>
        <div className="flex">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="btn btn-primary btn-md rounded-r-none"
          >
            Choose Files
          </button>
          <UploadSourceMenu onFile={(file) => addFiles([file])} />
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="application/pdf"
          className="hidden"
          onChange={(event) => addFiles(event.target.files)}
        />
      </div>

      {items.length > 0 && (
        <>
          <p className="mt-4 text-xs text-base-content/50">Drag a file by its grip handle to reorder, then merge.</p>
          <ul className="mt-2 divide-y divide-base-300">
          {items.map((item, index) => (
            <li
              key={item.id}
              ref={(el) => {
                if (el) itemRefs.current.set(item.id, el);
                else itemRefs.current.delete(item.id);
              }}
              className={`flex flex-col gap-2 rounded-lg py-2 text-sm transition ${
                draggingId === item.id ? "bg-primary/5 ring-2 ring-primary/40" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2 truncate">
                  <span
                    onPointerDown={(event) => startDrag(item.id, event)}
                    style={{ touchAction: "none" }}
                    className="cursor-grab text-base-content/40 hover:text-base-content/70 active:cursor-grabbing"
                    aria-label="Drag to reorder"
                    title="Drag to reorder"
                  >
                    <ToolIcon name="grip" className="h-4 w-4" />
                  </span>
                  <span className="badge badge-neutral badge-sm">{index + 1}</span>
                  <span className="truncate text-base-content/80">{item.file.name}</span>
                  {item.needsPassword && (
                    <ToolIcon name="protect-pdf" className="h-3.5 w-3.5 shrink-0 text-warning" aria-label="Password protected" />
                  )}
                </span>
                <span className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveItem(index, -1)}
                    disabled={index === 0}
                    aria-label="Move up"
                    className="btn btn-ghost btn-xs btn-square"
                  >
                    <ToolIcon name="chevron-down" className="h-3.5 w-3.5 rotate-180" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(index, 1)}
                    disabled={index === items.length - 1}
                    aria-label="Move down"
                    className="btn btn-ghost btn-xs btn-square"
                  >
                    <ToolIcon name="chevron-down" className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="btn btn-ghost btn-xs text-error"
                  >
                    Remove
                  </button>
                </span>
              </div>

              {item.needsPassword && (
                <div className="flex flex-wrap items-center gap-2 pl-8">
                  <input
                    type="password"
                    value={item.password}
                    onChange={(event) => setItemPassword(item.id, event.target.value)}
                    placeholder="Enter password to unlock this file"
                    className="input input-bordered input-sm flex-1"
                  />
                  {item.passwordError && <span className="text-xs text-error">{item.passwordError}</span>}
                </div>
              )}
            </li>
          ))}
          </ul>
        </>
      )}

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      {items.length > 0 && (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {status === "done" && downloadUrl ? (
              <a href={downloadUrl} download="merged.pdf" className="btn btn-primary flex-1">
                <ToolIcon name="download" className="h-4 w-4" />
                Download Merged PDF
              </a>
            ) : (
              <button
                type="button"
                onClick={handleMerge}
                disabled={items.length < 2 || status === "merging"}
                className="btn btn-primary flex-1"
              >
                {status === "merging" ? "Merging..." : "Merge PDF"}
              </button>
            )}
          </div>
          {items.length === 1 && (
            <p className="mt-2 text-xs text-base-content/50">Add at least one more PDF to merge.</p>
          )}
        </>
      )}
    </div>
  );
}
