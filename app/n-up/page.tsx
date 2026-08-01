import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { NUpWorkspace } from "@/components/NUpWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("n-up")!;

export const metadata: Metadata = toolMetadata(tool);

export default function NUpPage() {
  return <ToolPageLayout tool={tool} workspace={<NUpWorkspace />} />;
}
