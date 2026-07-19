import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { JpgToPdfWorkspace } from "@/components/JpgToPdfWorkspace";
import { getToolBySlug } from "@/lib/tools";

const tool = getToolBySlug("jpg-to-pdf")!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.heroDescription,
};

export default function JpgToPdfPage() {
  return <ToolPageLayout tool={tool} workspace={<JpgToPdfWorkspace />} />;
}
