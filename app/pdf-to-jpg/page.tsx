import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { PdfToJpgWorkspace } from "@/components/PdfToJpgWorkspace";
import { getToolBySlug } from "@/lib/tools";

const tool = getToolBySlug("pdf-to-jpg")!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.heroDescription,
};

export default function PdfToJpgPage() {
  return <ToolPageLayout tool={tool} workspace={<PdfToJpgWorkspace />} />;
}
