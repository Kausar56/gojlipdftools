import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { RemoveAnnotationsWorkspace } from "@/components/RemoveAnnotationsWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("remove-annotations")!;

export const metadata: Metadata = toolMetadata(tool);

export default function RemoveAnnotationsPage() {
  return <ToolPageLayout tool={tool} workspace={<RemoveAnnotationsWorkspace />} />;
}
