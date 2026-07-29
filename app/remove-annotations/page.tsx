import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { RemoveAnnotationsWorkspace } from "@/components/RemoveAnnotationsWorkspace";
import { getToolBySlug } from "@/lib/tools";

const tool = getToolBySlug("remove-annotations")!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.heroDescription,
};

export default function RemoveAnnotationsPage() {
  return <ToolPageLayout tool={tool} workspace={<RemoveAnnotationsWorkspace />} />;
}
