import type { Metadata } from "next";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { OfficeConvertWorkspace } from "@/components/OfficeConvertWorkspace";
import { getToolBySlug } from "@/lib/tools";
import { toolMetadata } from "@/lib/seo";

const tool = getToolBySlug("word-to-pdf")!;

export async function generateMetadata(): Promise<Metadata> {
  return toolMetadata(tool);
}

export default function WordToPdfPage() {
  return (
    <ToolPageLayout
      tool={tool}
      workspace={
        <OfficeConvertWorkspace
          inputFormat="docx"
          outputFormat="pdf"
          accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          icon={tool.icon}
          actionLabel="Convert to PDF"
        />
      }
    />
  );
}
