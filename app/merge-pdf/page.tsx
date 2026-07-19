import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { MergePdfWorkspace } from "@/components/MergePdfWorkspace";
import { getToolBySlug } from "@/lib/tools";

const tool = getToolBySlug("merge-pdf")!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.heroDescription,
};

export default function MergePdfPage() {
  return <ToolPageLayout tool={tool} workspace={<MergePdfWorkspace />} />;
}
