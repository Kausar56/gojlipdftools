import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { DeletePagesWorkspace } from "@/components/DeletePagesWorkspace";
import { getToolBySlug } from "@/lib/tools";

const tool = getToolBySlug("delete-pages")!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.heroDescription,
};

export default function DeletePagesPage() {
  return <ToolPageLayout tool={tool} workspace={<DeletePagesWorkspace />} />;
}
