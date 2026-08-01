import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FlipWorkspace } from "@/components/FlipWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("flip")!;

export const metadata: Metadata = toolMetadata(tool);

export default function FlipPage() {
  return <ToolPageLayout tool={tool} workspace={<FlipWorkspace />} />;
}
