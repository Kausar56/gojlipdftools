import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { RepairWorkspace } from "@/components/RepairWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("repair")!;

export async function generateMetadata(): Promise<Metadata> {
  return toolMetadata(tool);
}

export default function RepairPage() {
  return <ToolPageLayout tool={tool} workspace={<RepairWorkspace />} />;
}
