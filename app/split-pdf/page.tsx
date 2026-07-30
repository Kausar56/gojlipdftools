import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { SplitPdfWorkspace } from "@/components/SplitPdfWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("split-pdf")!;

export const metadata: Metadata = toolMetadata(tool);

export default function SplitPdfPage() {
  return <ToolPageLayout tool={tool} workspace={<SplitPdfWorkspace />} />;
}
