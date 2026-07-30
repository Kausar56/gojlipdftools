import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { PdfEditorWorkspace } from "@/components/PdfEditorWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("edit-pdf")!;

export const metadata: Metadata = toolMetadata(tool);

export default function EditPdfPage() {
  return (
    <ToolPageLayout tool={tool} maxWidthClassName="max-w-7xl" workspace={<PdfEditorWorkspace />} />
  );
}
