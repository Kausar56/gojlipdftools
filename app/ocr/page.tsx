import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { OcrPdfWorkspace } from "@/components/OcrPdfWorkspace";
import { getToolBySlug } from "@/lib/tools";

const tool = getToolBySlug("ocr")!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.heroDescription,
};

export default function OcrPage() {
  return <ToolPageLayout tool={tool} workspace={<OcrPdfWorkspace />} />;
}
