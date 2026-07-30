import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { UnlockPdfWorkspace } from "@/components/UnlockPdfWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("unlock-pdf")!;

export const metadata: Metadata = toolMetadata(tool);

export default function UnlockPdfPage() {
  return <ToolPageLayout tool={tool} workspace={<UnlockPdfWorkspace />} />;
}
