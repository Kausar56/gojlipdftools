import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { RotatePdfWorkspace } from "@/components/RotatePdfWorkspace";
import { getToolBySlug } from "@/lib/tools";

const tool = getToolBySlug("rotate-pdf")!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.heroDescription,
};

export default function RotatePdfPage() {
  return <ToolPageLayout tool={tool} workspace={<RotatePdfWorkspace />} />;
}
