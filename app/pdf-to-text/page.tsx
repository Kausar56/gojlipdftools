import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { PdfToTextWorkspace } from "@/components/PdfToTextWorkspace";
import { getToolBySlug } from "@/lib/tools";

const tool = getToolBySlug("pdf-to-text")!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.heroDescription,
};

export default function PdfToTextPage() {
  return <ToolPageLayout tool={tool} workspace={<PdfToTextWorkspace />} />;
}
