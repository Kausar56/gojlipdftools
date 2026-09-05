import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { DeskewWorkspace } from "@/components/DeskewWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("deskew")!;

export async function generateMetadata(): Promise<Metadata> {
  return toolMetadata(tool);
}

export default function DeskewPage() {
  return <ToolPageLayout tool={tool} workspace={<DeskewWorkspace />} />;
}
