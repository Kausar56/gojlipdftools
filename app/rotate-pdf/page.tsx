import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { RotatePdfWorkspace } from "@/components/RotatePdfWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("rotate-pdf")!;

export const metadata: Metadata = toolMetadata(tool);

export default function RotatePdfPage() {
  return <ToolPageLayout tool={tool} workspace={<RotatePdfWorkspace />} />;
}
