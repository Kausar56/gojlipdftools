import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { HtmlToPdfWorkspace } from "@/components/HtmlToPdfWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("html-to-pdf")!;

export const metadata: Metadata = toolMetadata(tool);

export default function HtmlToPdfPage() {
  return <ToolPageLayout tool={tool} workspace={<HtmlToPdfWorkspace />} />;
}
