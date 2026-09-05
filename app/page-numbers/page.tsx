import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { PageNumbersWorkspace } from "@/components/PageNumbersWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("page-numbers")!;

export async function generateMetadata(): Promise<Metadata> {
  return toolMetadata(tool);
}

export default function PageNumbersPage() {
  return <ToolPageLayout tool={tool} workspace={<PageNumbersWorkspace />} />;
}
