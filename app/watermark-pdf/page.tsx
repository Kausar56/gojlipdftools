import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { WatermarkPdfWorkspace } from "@/components/WatermarkPdfWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("watermark-pdf")!;

export async function generateMetadata(): Promise<Metadata> {
  return toolMetadata(tool);
}

export default function WatermarkPdfPage() {
  return <ToolPageLayout tool={tool} maxWidthClassName="max-w-7xl" workspace={<WatermarkPdfWorkspace />} />;
}
