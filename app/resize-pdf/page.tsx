import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { ResizePdfWorkspace } from "@/components/ResizePdfWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("resize-pdf")!;

export const metadata: Metadata = toolMetadata(tool);

export default function ResizePdfPage() {
  return <ToolPageLayout tool={tool} workspace={<ResizePdfWorkspace />} />;
}
