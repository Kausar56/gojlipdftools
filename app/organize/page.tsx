import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { OrganizeWorkspace } from "@/components/OrganizeWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("organize")!;

export async function generateMetadata(): Promise<Metadata> {
  return toolMetadata(tool);
}

export default function OrganizePage() {
  return <ToolPageLayout tool={tool} workspace={<OrganizeWorkspace />} />;
}
