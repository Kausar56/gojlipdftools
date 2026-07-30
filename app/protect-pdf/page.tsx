import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { ProtectPdfWorkspace } from "@/components/ProtectPdfWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("protect-pdf")!;

export const metadata: Metadata = toolMetadata(tool);

export default function ProtectPdfPage() {
  return <ToolPageLayout tool={tool} workspace={<ProtectPdfWorkspace />} />;
}
