import type { Metadata } from "next";
import { TrustBadges } from "@/components/TrustBadges";

export const metadata: Metadata = {
  title: "About",
  description: "PDFFlow is a free, browser-based toolkit for merging, splitting, compressing, and converting PDFs.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-8">
      <h1 className="text-3xl font-semibold text-base-content sm:text-4xl">About PDFFlow</h1>
      <p className="mt-4 text-base text-base-content/70 sm:text-lg">
        PDFFlow is a free toolkit for everyday PDF work — merging, splitting, compressing, and
        converting files between PDF, Word, Excel, PowerPoint, and image formats.
      </p>
      <p className="mt-4 text-base text-base-content/70 sm:text-lg">
        Every tool runs directly in your browser. Your files are never uploaded to a server, so
        there&apos;s nothing to wait on and nothing to worry about once you close the tab.
      </p>
      <TrustBadges className="mt-8" />
    </div>
  );
}
