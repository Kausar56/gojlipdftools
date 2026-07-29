import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FlattenPdfWorkspace } from "@/components/FlattenPdfWorkspace";
import { getToolBySlug } from "@/lib/tools";

const tool = getToolBySlug("flatten-pdf")!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.heroDescription,
};

export default function FlattenPdfPage() {
  return <ToolPageLayout tool={tool} workspace={<FlattenPdfWorkspace />} />;
}
