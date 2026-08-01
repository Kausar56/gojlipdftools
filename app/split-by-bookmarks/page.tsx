import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { SplitByBookmarksWorkspace } from "@/components/SplitByBookmarksWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("split-by-bookmarks")!;

export const metadata: Metadata = toolMetadata(tool);

export default function SplitByBookmarksPage() {
  return <ToolPageLayout tool={tool} workspace={<SplitByBookmarksWorkspace />} />;
}
