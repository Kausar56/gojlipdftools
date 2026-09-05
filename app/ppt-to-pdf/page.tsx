import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { OfficeConvertWorkspace } from "@/components/OfficeConvertWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("ppt-to-pdf")!;

export async function generateMetadata(): Promise<Metadata> {
  return toolMetadata(tool);
}

export default function PptToPdfPage() {
  return (
    <ToolPageLayout
      tool={tool}
      workspace={
        <OfficeConvertWorkspace
          inputFormat="pptx"
          outputFormat="pdf"
          accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          icon={tool.icon}
          actionLabel="Convert to PDF"
        />
      }
    />
  );
}
