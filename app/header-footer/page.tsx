import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { HeaderFooterWorkspace } from "@/components/HeaderFooterWorkspace";
import { getToolBySlug } from "@/lib/tools";

const tool = getToolBySlug("header-footer")!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.heroDescription,
};

export default function HeaderFooterPage() {
  return <ToolPageLayout tool={tool} workspace={<HeaderFooterWorkspace />} />;
}
