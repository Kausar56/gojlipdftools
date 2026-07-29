import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { PageNumbersWorkspace } from "@/components/PageNumbersWorkspace";
import { getToolBySlug } from "@/lib/tools";

const tool = getToolBySlug("page-numbers")!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.heroDescription,
};

export default function PageNumbersPage() {
  return <ToolPageLayout tool={tool} workspace={<PageNumbersWorkspace />} />;
}
