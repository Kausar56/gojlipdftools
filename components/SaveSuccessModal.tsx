"use client";

import Link from "next/link";
import { getToolBySlug } from "@/lib/tools";
import { ToolIcon } from "./icons";

const DEFAULT_RECOMMENDED_SLUGS = ["merge-pdf", "compress-pdf", "protect-pdf", "watermark-pdf"];

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
  const recommended = recommendedSlugs
    .map((slug) => getToolBySlug(slug))
    .filter((tool): tool is NonNullable<typeof tool> => Boolean(tool));

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl border border-base-300 bg-base-100 p-6 shadow-2xl">
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

        <a href={downloadUrl} download={downloadFileName} className="btn btn-primary mt-5 w-full">
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
