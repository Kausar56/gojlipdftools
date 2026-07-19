import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { WatermarkPdfWorkspace } from "@/components/WatermarkPdfWorkspace";
import { getToolBySlug } from "@/lib/tools";

const tool = getToolBySlug("watermark-pdf")!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.heroDescription,
};

export default function WatermarkPdfPage() {
  return <ToolPageLayout tool={tool} workspace={<WatermarkPdfWorkspace />} />;
}
