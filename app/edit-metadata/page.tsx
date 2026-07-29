import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { EditMetadataWorkspace } from "@/components/EditMetadataWorkspace";
import { getToolBySlug } from "@/lib/tools";

const tool = getToolBySlug("edit-metadata")!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.heroDescription,
};

export default function EditMetadataPage() {
  return <ToolPageLayout tool={tool} workspace={<EditMetadataWorkspace />} />;
}
