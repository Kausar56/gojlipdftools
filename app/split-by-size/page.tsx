import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { SplitBySizeWorkspace } from "@/components/SplitBySizeWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("split-by-size")!;

export async function generateMetadata(): Promise<Metadata> {
  return toolMetadata(tool);
}

export default function SplitBySizePage() {
  return <ToolPageLayout tool={tool} workspace={<SplitBySizeWorkspace />} />;
}
