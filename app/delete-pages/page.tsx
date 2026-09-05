import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { DeletePagesWorkspace } from "@/components/DeletePagesWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("delete-pages")!;

export async function generateMetadata(): Promise<Metadata> {
  return toolMetadata(tool);
}

export default function DeletePagesPage() {
  return <ToolPageLayout tool={tool} workspace={<DeletePagesWorkspace />} />;
}
