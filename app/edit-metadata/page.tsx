import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { EditMetadataWorkspace } from "@/components/EditMetadataWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("edit-metadata")!;

export const metadata: Metadata = toolMetadata(tool);

export default function EditMetadataPage() {
  return <ToolPageLayout tool={tool} workspace={<EditMetadataWorkspace />} />;
}
