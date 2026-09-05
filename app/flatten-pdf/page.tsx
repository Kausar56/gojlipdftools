import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FlattenPdfWorkspace } from "@/components/FlattenPdfWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("flatten-pdf")!;

export async function generateMetadata(): Promise<Metadata> {
  return toolMetadata(tool);
}

export default function FlattenPdfPage() {
  return <ToolPageLayout tool={tool} workspace={<FlattenPdfWorkspace />} />;
}
