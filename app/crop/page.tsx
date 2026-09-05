import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { CropWorkspace } from "@/components/CropWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("crop")!;

export async function generateMetadata(): Promise<Metadata> {
  return toolMetadata(tool);
}

export default function CropPage() {
  return <ToolPageLayout tool={tool} workspace={<CropWorkspace />} />;
}
