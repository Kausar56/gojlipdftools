import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { CompressPdfWorkspace } from "@/components/CompressPdfWorkspace";
import { getToolBySlug } from "@/lib/tools";

const tool = getToolBySlug("compress-pdf")!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.heroDescription,
};

export default function CompressPdfPage() {
  return <ToolPageLayout tool={tool} workspace={<CompressPdfWorkspace />} />;
}
