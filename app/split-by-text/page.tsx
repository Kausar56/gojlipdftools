import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { SplitByTextWorkspace } from "@/components/SplitByTextWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("split-by-text")!;

export const metadata: Metadata = toolMetadata(tool);

export default function SplitByTextPage() {
  return <ToolPageLayout tool={tool} workspace={<SplitByTextWorkspace />} />;
}
