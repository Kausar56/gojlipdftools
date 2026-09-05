import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { CreateBookmarksWorkspace } from "@/components/CreateBookmarksWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("create-bookmarks")!;

export async function generateMetadata(): Promise<Metadata> {
  return toolMetadata(tool);
}

export default function CreateBookmarksPage() {
  return <ToolPageLayout tool={tool} workspace={<CreateBookmarksWorkspace />} />;
}
