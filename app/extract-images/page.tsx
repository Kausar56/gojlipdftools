import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { ExtractImagesWorkspace } from "@/components/ExtractImagesWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("extract-images")!;

export const metadata: Metadata = toolMetadata(tool);

export default function ExtractImagesPage() {
  return <ToolPageLayout tool={tool} workspace={<ExtractImagesWorkspace />} />;
}
