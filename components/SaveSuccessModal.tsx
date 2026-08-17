"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getToolBySlug } from "@/lib/tools";
import { loadPdfjs } from "@/lib/pdfjs";
import { ToolIcon } from "./icons";

const DEFAULT_RECOMMENDED_SLUGS = ["merge-pdf", "compress-pdf", "protect-pdf", "watermark-pdf"];

// Rendered well above the on-screen display size so there's real pixel
// detail left to zoom into — a 560px-wide render already looked soft past
// about 150% zoom.
const PREVIEW_RENDER_WIDTH_PX = 1120;

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.25;

type PreviewState = { status: "loading" } | { status: "ready"; src: string; pageCount: number } | { status: "unavailable" };

export function SaveSuccessModal({
  downloadUrl,
  downloadFileName,
  onClose,
  recommendedSlugs = DEFAULT_RECOMMENDED_SLUGS,
}: {
  downloadUrl: string;
  downloadFileName: string;
  onClose: () => void;
  recommendedSlugs?: string[];
}) {
  const [preview, setPreview] = useState<PreviewState>({ status: "loading" });
  const [zoom, setZoom] = useState(1);

  // Renders the first page of the actual saved file so the user can confirm
  // it looks right before downloading — fetch() works the same for a local
  // blob: URL (the common case) and a remote server-generated URL alike, so
  // every caller just passes whatever downloadUrl it already has. Falls back
  // to no preview (rather than breaking the modal) for non-PDF output or if
  // the fetch/render fails for any reason — a corrupt render here shouldn't
  // block the user from downloading a file that saved just fine.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setPreview({ status: "loading" });
      setZoom(1);
      if (!downloadFileName.toLowerCase().endsWith(".pdf")) {
        setPreview({ status: "unavailable" });
        return;
      }
      try {
        const [pdfjs, res] = await Promise.all([loadPdfjs(), fetch(downloadUrl)]);
        if (!res.ok) throw new Error("Couldn't read the saved file.");
        const bytes = await res.arrayBuffer();
        const doc = await pdfjs.getDocument({ data: bytes }).promise;
        const page = await doc.getPage(1);
        const baseViewport = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: PREVIEW_RENDER_WIDTH_PX / baseViewport.width });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas rendering isn't supported here.");
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        if (cancelled) return;
        setPreview({ status: "ready", src: canvas.toDataURL("image/png"), pageCount: doc.numPages });
      } catch {
        if (!cancelled) setPreview({ status: "unavailable" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [downloadUrl, downloadFileName]);

  const recommended = recommendedSlugs
    .map((slug) => getToolBySlug(slug))
    .filter((tool): tool is NonNullable<typeof tool> => Boolean(tool));

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl border border-base-300 bg-base-100 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
              <ToolIcon name="check" className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-base-content">Your PDF is ready</p>
              <p className="text-xs text-base-content/60">Saved successfully — download it below.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="btn btn-ghost btn-xs btn-square">
            <ToolIcon name="close" className="h-4 w-4" />
          </button>
        </div>

        {preview.status !== "unavailable" && (
          <div className="mt-5 flex flex-col items-center">
            <div
              className={`h-96 w-full rounded-lg border border-base-300 bg-base-200 p-2 ${
                preview.status === "ready" && zoom > 1 ? "overflow-auto" : "flex items-center justify-center overflow-hidden"
              }`}
            >
              {preview.status === "loading" ? (
                <div className="flex h-72 w-full max-w-72 animate-pulse items-center justify-center rounded bg-base-300/60">
                  <ToolIcon name="file" className="h-8 w-8 text-base-content/20" />
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.src}
                  alt="Preview of the saved PDF"
                  // Below 100%, let object-contain do the usual fit-within-the-box
                  // sizing (no explicit width — this is exactly the pre-zoom
                  // behavior). At/above 100%, switch to an explicit percentage
                  // width instead — mixing the two would let max-height clamp
                  // the height while width stayed pinned, stretching the image.
                  // max-w-none is required here: Tailwind's Preflight applies
                  // `max-width: 100%` to every <img> by default, which silently
                  // clamped the zoomed width right back down to the container's
                  // own width no matter how high the percentage went.
                  style={zoom > 1 ? { width: `${zoom * 100}%` } : undefined}
                  className={zoom > 1 ? "max-w-none rounded shadow-sm" : "max-h-full max-w-full rounded object-contain shadow-sm"}
                />
              )}
            </div>

            {preview.status === "ready" && (
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 100) / 100))}
                  disabled={zoom <= ZOOM_MIN}
                  aria-label="Zoom out"
                  title="Zoom out"
                  className="btn btn-ghost btn-xs btn-square"
                >
                  <ToolIcon name="minus" className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  title="Reset zoom"
                  className="w-12 text-center text-xs tabular-nums text-base-content/60 hover:text-primary"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 100) / 100))}
                  disabled={zoom >= ZOOM_MAX}
                  aria-label="Zoom in"
                  title="Zoom in"
                  className="btn btn-ghost btn-xs btn-square"
                >
                  <ToolIcon name="plus" className="h-3.5 w-3.5" />
                </button>
                {preview.pageCount > 1 && (
                  <span className="ml-1 text-xs text-base-content/50">Page 1 of {preview.pageCount}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* target="_blank" is a no-op for a blob: URL (the `download`
            attribute takes over and saves it directly) but matters for a
            remote, cross-origin downloadUrl (e.g. Compress PDF's "advanced"
            mode) — there, `download` is ignored by the browser, so without
            this the link would navigate the current tab away instead. */}
        <a
          href={downloadUrl}
          download={downloadFileName}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary mt-5 w-full"
        >
          <ToolIcon name="download" className="h-4 w-4" />
          Download PDF
        </a>

        {recommended.length > 0 && (
          <div className="mt-6 border-t border-base-300 pt-4">
            <p className="text-xs font-medium tracking-wide text-base-content/50 uppercase">You might also need</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {recommended.map((tool) => (
                <Link
                  key={tool.slug}
                  href={`/${tool.slug}`}
                  className="flex items-center gap-2 rounded-lg border border-base-300 px-3 py-2 text-sm text-base-content/80 transition hover:border-primary hover:text-primary"
                >
                  <ToolIcon name={tool.icon} className="h-4 w-4 shrink-0" />
                  <span className="truncate">{tool.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
