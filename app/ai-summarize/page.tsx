import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { AiSummarizeWorkspace } from "@/components/AiSummarizeWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("ai-summarize")!;

export async function generateMetadata(): Promise<Metadata> {
  return toolMetadata(tool);
}

export default function AiSummarizePage() {
  return <ToolPageLayout tool={tool} workspace={<AiSummarizeWorkspace />} />;
}
