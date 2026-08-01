import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { CreateBookmarksWorkspace } from "@/components/CreateBookmarksWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("create-bookmarks")!;

export const metadata: Metadata = toolMetadata(tool);

export default function CreateBookmarksPage() {
  return <ToolPageLayout tool={tool} workspace={<CreateBookmarksWorkspace />} />;
}
