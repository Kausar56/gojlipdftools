import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { getToolBySlug } from "@/lib/tools";

const tool = getToolBySlug("word-to-pdf")!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.heroDescription,
};

export default function WordToPdfPage() {
  return <ToolPageLayout tool={tool} />;
}
