import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { OfficeConvertWorkspace } from "@/components/OfficeConvertWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("excel-to-pdf")!;

export async function generateMetadata(): Promise<Metadata> {
  return toolMetadata(tool);
}

export default function ExcelToPdfPage() {
  return (
    <ToolPageLayout
      tool={tool}
      workspace={
        <OfficeConvertWorkspace
          inputFormat="xlsx"
          outputFormat="pdf"
          accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          icon={tool.icon}
          actionLabel="Convert to PDF"
        />
      }
    />
  );
}
