import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { CreateFormsWorkspace } from "@/components/CreateFormsWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("create-forms")!;

export const metadata: Metadata = toolMetadata(tool);

export default function CreateFormsPage() {
  return <ToolPageLayout tool={tool} maxWidthClassName="max-w-7xl" workspace={<CreateFormsWorkspace />} />;
}
