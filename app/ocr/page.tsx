import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { OcrPdfWorkspace } from "@/components/OcrPdfWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("ocr")!;

export async function generateMetadata(): Promise<Metadata> {
  return toolMetadata(tool);
}

export default function OcrPage() {
  return <ToolPageLayout tool={tool} workspace={<OcrPdfWorkspace />} />;
}
