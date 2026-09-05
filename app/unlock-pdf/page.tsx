import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { UnlockPdfWorkspace } from "@/components/UnlockPdfWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("unlock-pdf")!;

export async function generateMetadata(): Promise<Metadata> {
  return toolMetadata(tool);
}

export default function UnlockPdfPage() {
  return <ToolPageLayout tool={tool} workspace={<UnlockPdfWorkspace />} />;
}
