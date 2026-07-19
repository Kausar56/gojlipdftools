import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { getToolBySlug } from "@/lib/tools";

const tool = getToolBySlug("excel-to-pdf")!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.heroDescription,
};

export default function ExcelToPdfPage() {
  return <ToolPageLayout tool={tool} />;
}
