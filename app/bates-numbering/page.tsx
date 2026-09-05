import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { BatesNumberingWorkspace } from "@/components/BatesNumberingWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("bates-numbering")!;

export async function generateMetadata(): Promise<Metadata> {
  return toolMetadata(tool);
}

export default function BatesNumberingPage() {
  return <ToolPageLayout tool={tool} workspace={<BatesNumberingWorkspace />} />;
}
