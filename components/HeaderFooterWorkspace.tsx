"use client";

import { useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";

type Status = "idle" | "working" | "done" | "error";

type Zones = {
  headerLeft: string;
  headerCenter: string;
  headerRight: string;
  footerLeft: string;
  footerCenter: string;
  footerRight: string;
};

const emptyZones: Zones = {
  headerLeft: "",
  headerCenter: "",
  headerRight: "",
  footerLeft: "",
  footerCenter: "",
  footerRight: "",
};

const FIELDS: { key: keyof Zones; label: string }[] = [
  { key: "headerLeft", label: "Header — Left" },
  { key: "headerCenter", label: "Header — Center" },
  { key: "headerRight", label: "Header — Right" },
  { key: "footerLeft", label: "Footer — Left" },
  { key: "footerCenter", label: "Footer — Center" },
  { key: "footerRight", label: "Footer — Right" },
];

const MARGIN_PT = 24;
const FONT_SIZE = 10;

export function HeaderFooterWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [zones, setZones] = useState<Zones>(emptyZones);
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
    setZones(emptyZones);
  }

  async function handleApply() {
    if (!file) return;
    const hasAnyText = Object.values(zones).some((v) => v.trim());
    if (!hasAnyText) {
      setStatus("error");
      setErrorMessage("Fill in at least one header or footer field.");
      return;
    }

    setStatus("working");
    setErrorMessage("");

    try {
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const pages = doc.getPages();

      const resolve = (template: string, pageNumber: number) =>
        template.replace("{page}", String(pageNumber)).replace("{pages}", String(pages.length));

      pages.forEach((page, index) => {
        const { width: pageWidth, height: pageHeight } = page.getSize();
        const pageNumber = index + 1;

        const draw = (rawText: string, y: number, align: "left" | "center" | "right") => {
          const text = resolve(rawText, pageNumber);
          if (!text.trim()) return;
          const textWidth = font.widthOfTextAtSize(text, FONT_SIZE);
          const x =
            align === "center"
              ? (pageWidth - textWidth) / 2
              : align === "right"
                ? pageWidth - MARGIN_PT - textWidth
                : MARGIN_PT;
          page.drawText(text, { x, y, size: FONT_SIZE, font, color: rgb(0.2, 0.2, 0.2) });
        };

        draw(zones.headerLeft, pageHeight - MARGIN_PT, "left");
        draw(zones.headerCenter, pageHeight - MARGIN_PT, "center");
        draw(zones.headerRight, pageHeight - MARGIN_PT, "right");
        draw(zones.footerLeft, MARGIN_PT - FONT_SIZE, "left");
        draw(zones.footerCenter, MARGIN_PT - FONT_SIZE, "center");
        draw(zones.footerRight, MARGIN_PT - FONT_SIZE, "right");
      });

      const outBytes = await doc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("done");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? `Couldn't add header/footer: ${error.message}` : "Couldn't add a header or footer to this PDF.",
      );
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
          <ToolIcon name="text-multiline" className="h-4 w-4 text-secondary" />
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

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <label key={field.key} className="block text-sm font-medium text-base-content">
            {field.label}
            <input
              type="text"
              value={zones[field.key]}
              onChange={(event) => {
                setZones((prev) => ({ ...prev, [field.key]: event.target.value }));
                resetOutput();
              }}
              placeholder="e.g. Confidential, {page} of {pages}"
              className="input input-bordered mt-1.5 w-full"
            />
          </label>
        ))}
      </div>
      <p className="mt-2 text-xs text-base-content/50">
        Use {"{page}"} for the current page number and {"{pages}"} for the total page count.
      </p>

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      <div className="mt-5">
        {status === "done" && downloadUrl ? (
          <a href={downloadUrl} download="header-footer.pdf" className="btn btn-primary w-full">
            <ToolIcon name="download" className="h-4 w-4" />
            Download PDF
          </a>
        ) : (
          <button
            type="button"
            onClick={handleApply}
            disabled={status === "working"}
            className="btn btn-primary w-full"
          >
            {status === "working" ? "Applying..." : "Add Header & Footer"}
          </button>
        )}
      </div>
    </div>
  );
}
