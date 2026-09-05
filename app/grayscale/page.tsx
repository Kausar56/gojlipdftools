import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { GrayscaleWorkspace } from "@/components/GrayscaleWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("grayscale")!;

export async function generateMetadata(): Promise<Metadata> {
  return toolMetadata(tool);
}

export default function GrayscalePage() {
  return <ToolPageLayout tool={tool} workspace={<GrayscaleWorkspace />} />;
}
