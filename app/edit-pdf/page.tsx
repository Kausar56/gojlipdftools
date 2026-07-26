import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { PdfEditorWorkspace } from "@/components/PdfEditorWorkspace";
import { getToolBySlug } from "@/lib/tools";

const tool = getToolBySlug("edit-pdf")!;

export const metadata: Metadata = {
  title: tool.name,
  description: tool.heroDescription,
};

export default function EditPdfPage() {
  return (
    <ToolPageLayout tool={tool} maxWidthClassName="max-w-7xl" workspace={<PdfEditorWorkspace />} />
  );
}
