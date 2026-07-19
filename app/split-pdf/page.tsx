import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { SplitPdfWorkspace } from "@/components/SplitPdfWorkspace";
import { getToolBySlug } from "@/lib/tools";

const tool = getToolBySlug("split-pdf")!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.heroDescription,
};

export default function SplitPdfPage() {
  return <ToolPageLayout tool={tool} workspace={<SplitPdfWorkspace />} />;
}
