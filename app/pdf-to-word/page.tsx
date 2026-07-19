import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { getToolBySlug } from "@/lib/tools";

const tool = getToolBySlug("pdf-to-word")!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.heroDescription,
};

export default function PdfToWordPage() {
  return <ToolPageLayout tool={tool} />;
}
