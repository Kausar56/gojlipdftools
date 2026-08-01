import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { AlternateMixWorkspace } from "@/components/AlternateMixWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("alternate-mix")!;

export const metadata: Metadata = toolMetadata(tool);

export default function AlternateMixPage() {
  return <ToolPageLayout tool={tool} workspace={<AlternateMixWorkspace />} />;
}
