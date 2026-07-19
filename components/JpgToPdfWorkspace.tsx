"use client";

import { useEffect, useRef, useState } from "react";
import { ToolIcon } from "./icons";

type ImageItem = {
  id: string;
  file: File;
  previewUrl: string;
};

type Status = "idle" | "converting" | "done" | "error";

export function JpgToPdfWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<ImageItem[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const downloadUrlRef = useRef(downloadUrl);
  downloadUrlRef.current = downloadUrl;

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
    };
  }, []);

  function resetOutput() {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setStatus("idle");
    setErrorMessage("");
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const next = Array.from(fileList)
      .filter((file) => file.type === "image/jpeg" || file.type === "image/png")
      .map((file) => ({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      }));
    setItems((prev) => [...prev, ...next]);
    resetOutput();
  }

  function removeItem(id: string) {
    setItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
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
  }

  async function handleConvert() {
    if (items.length === 0) return;
    setStatus("converting");
    setErrorMessage("");

    try {
      const { PDFDocument } = await import("pdf-lib");
      const doc = await PDFDocument.create();

      for (const item of items) {
        const bytes = await item.file.arrayBuffer();
        const image = item.file.type === "image/png" ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
        const page = doc.addPage([image.width, image.height]);
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
      }

      const outBytes = await doc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("done");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? `Couldn't convert these images: ${error.message}`
          : "Couldn't convert these images.",
      );
    }
  }

  return (
    <div className="card border border-base-300 bg-base-100 p-6 shadow-sm">
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          addFiles(event.dataTransfer.files);
        }}
        className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-base-300 px-6 py-10 text-center"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ToolIcon name="upload" className="h-6 w-6" />
        </span>
        <p className="text-sm text-base-content/70">Drag & drop JPG or PNG files here, or</p>
        <button type="button" onClick={() => inputRef.current?.click()} className="btn btn-primary btn-sm">
          Choose Images
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(event) => addFiles(event.target.files)}
        />
      </div>

      {items.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item, index) => (
            <li key={item.id} className="relative overflow-hidden rounded-lg border border-base-300">
              <span className="badge badge-neutral badge-sm absolute left-1.5 top-1.5 z-10">{index + 1}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.previewUrl} alt={item.file.name} className="h-28 w-full object-cover" />
              <div className="flex items-center justify-between gap-1 bg-base-200 px-1.5 py-1">
                <button
                  type="button"
                  onClick={() => moveItem(index, -1)}
                  disabled={index === 0}
                  aria-label="Move earlier"
                  className="btn btn-ghost btn-xs btn-square"
                >
                  <ToolIcon name="chevron-down" className="h-3 w-3 rotate-90" />
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  aria-label="Remove"
                  className="btn btn-ghost btn-xs text-error"
                >
                  <ToolIcon name="close" className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(index, 1)}
                  disabled={index === items.length - 1}
                  aria-label="Move later"
                  className="btn btn-ghost btn-xs btn-square"
                >
                  <ToolIcon name="chevron-down" className="h-3 w-3 -rotate-90" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      <div className="mt-5">
        {status === "done" && downloadUrl ? (
          <a href={downloadUrl} download="images.pdf" className="btn btn-primary w-full">
            <ToolIcon name="download" className="h-4 w-4" />
            Download PDF
          </a>
        ) : (
          <button
            type="button"
            onClick={handleConvert}
            disabled={items.length === 0 || status === "converting"}
            className="btn btn-primary w-full"
          >
            {status === "converting" ? "Converting..." : "Convert to PDF"}
          </button>
        )}
      </div>
    </div>
  );
}
