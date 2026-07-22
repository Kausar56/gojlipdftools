"use client";

import { useRef, useState } from "react";
import { ToolIcon } from "./icons";

export function UploadDropzone({
  accept,
  actionLabel,
}: {
  accept: string;
  actionLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    setFiles((prev) => [...prev, ...Array.from(fileList)]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="card p-6">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          addFiles(event.dataTransfer.files);
        }}
        className={`flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
          isDragging ? "border-primary bg-primary/5" : "border-transparent"
        }`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ToolIcon name="upload" className="h-6 w-6" />
        </span>
        <p className="text-sm text-base-content/70">Drag & drop files here, or</p>
        <button type="button" onClick={() => inputRef.current?.click()} className="btn btn-primary btn-md">
          Choose Files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(event) => addFiles(event.target.files)}
        />
      </div>

      {files.length > 0 && (
        <ul className="mt-4 divide-y divide-base-300">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} className="flex items-center justify-between py-2 text-sm">
              <span className="truncate text-base-content/80">{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="btn btn-ghost btn-xs text-error"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button type="button" disabled className="btn btn-primary flex-1" title="Processing lands in the next phase">
          {actionLabel}
        </button>
        <span className="badge badge-outline badge-neutral">Coming soon</span>
      </div>
    </div>
  );
}
