import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { HeaderFooterWorkspace } from "@/components/HeaderFooterWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("header-footer")!;

export async function generateMetadata(): Promise<Metadata> {
  return toolMetadata(tool);
}

export default function HeaderFooterPage() {
  return <ToolPageLayout tool={tool} workspace={<HeaderFooterWorkspace />} />;
}
