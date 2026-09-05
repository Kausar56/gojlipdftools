import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FillSignWorkspace } from "@/components/FillSignWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("fill-sign")!;

export async function generateMetadata(): Promise<Metadata> {
  return toolMetadata(tool);
}

export default function FillSignPage() {
  return <ToolPageLayout tool={tool} workspace={<FillSignWorkspace />} />;
}
