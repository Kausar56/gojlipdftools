import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { OfficeConvertWorkspace } from "@/components/OfficeConvertWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("pdf-to-excel")!;

export async function generateMetadata(): Promise<Metadata> {
  return toolMetadata(tool);
}

export default function PdfToExcelPage() {
  return (
    <ToolPageLayout
      tool={tool}
      workspace={
        <OfficeConvertWorkspace
          inputFormat="pdf"
          outputFormat="xlsx"
          accept="application/pdf"
          icon={tool.icon}
          actionLabel="Convert to Excel"
        />
      }
    />
  );
}
