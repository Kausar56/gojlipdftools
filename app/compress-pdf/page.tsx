import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { CompressPdfWorkspace } from "@/components/CompressPdfWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("compress-pdf")!;

export async function generateMetadata(): Promise<Metadata> {
  return toolMetadata(tool);
}

export default function CompressPdfPage() {
  return <ToolPageLayout tool={tool} workspace={<CompressPdfWorkspace />} />;
}
