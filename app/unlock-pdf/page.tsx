import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { UnlockPdfWorkspace } from "@/components/UnlockPdfWorkspace";
import { getToolBySlug } from "@/lib/tools";

const tool = getToolBySlug("unlock-pdf")!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.heroDescription,
};

export default function UnlockPdfPage() {
  return <ToolPageLayout tool={tool} workspace={<UnlockPdfWorkspace />} />;
}
