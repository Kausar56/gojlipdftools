import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { JpgToPdfWorkspace } from "@/components/JpgToPdfWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("jpg-to-pdf")!;

export async function generateMetadata(): Promise<Metadata> {
  return toolMetadata(tool);
}

export default function JpgToPdfPage() {
  return <ToolPageLayout tool={tool} workspace={<JpgToPdfWorkspace />} />;
}
