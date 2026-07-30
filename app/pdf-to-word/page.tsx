import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { OfficeConvertWorkspace } from "@/components/OfficeConvertWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("pdf-to-word")!;

export const metadata: Metadata = toolMetadata(tool);

export default function PdfToWordPage() {
  return (
    <ToolPageLayout
      tool={tool}
      workspace={
        <OfficeConvertWorkspace
          inputFormat="pdf"
          outputFormat="docx"
          accept="application/pdf"
          icon={tool.icon}
          actionLabel="Convert to Word"
        />
      }
    />
  );
}
