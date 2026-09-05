import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { PdfToJpgWorkspace } from "@/components/PdfToJpgWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("pdf-to-jpg")!;

export async function generateMetadata(): Promise<Metadata> {
  return toolMetadata(tool);
}

export default function PdfToJpgPage() {
  return <ToolPageLayout tool={tool} workspace={<PdfToJpgWorkspace />} />;
}
