import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { PdfToTextWorkspace } from "@/components/PdfToTextWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("pdf-to-text")!;

export const metadata: Metadata = toolMetadata(tool);

export default function PdfToTextPage() {
  return <ToolPageLayout tool={tool} workspace={<PdfToTextWorkspace />} />;
}
