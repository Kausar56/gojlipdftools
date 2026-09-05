import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { MergePdfWorkspace } from "@/components/MergePdfWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("merge-pdf")!;

export async function generateMetadata(): Promise<Metadata> {
  return toolMetadata(tool);
}

export default function MergePdfPage() {
  return <ToolPageLayout tool={tool} workspace={<MergePdfWorkspace />} />;
}
