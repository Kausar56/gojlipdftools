import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentViewerAccess } from "@/lib/adminAuth";
import { getToolBySlug } from "@/lib/tools";
import { getEffectiveToolContent, getToolContentOverrideForEdit } from "@/lib/toolContent";
import { ToolContentEditor } from "@/components/ToolContentEditor";
import { updateToolContent, resetToolContent } from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  return { title: tool ? tool.name : "Tool Content" };
}

export default async function EditToolContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { access } = await getCurrentViewerAccess();
  if (access.kind !== "admin") redirect("/admin/blog");

  const tool = getToolBySlug(slug);
  if (!tool) notFound();

  const [effectiveContent, override] = await Promise.all([
    getEffectiveToolContent(tool),
    getToolContentOverrideForEdit(slug),
  ]);

  return (
    <div>
      <Link href="/admin/tool-content" className="text-xs text-primary hover:underline">
        ← Back to all tools
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-base-content">{tool.name}</h1>
      <p className="mt-1 text-sm text-base-content/60">
        Edit the &quot;How it works&quot; guide and FAQ shown below this tool. Leave everything as-is to keep the
        default copy.
      </p>

      <div className="mt-6 max-w-3xl">
        <ToolContentEditor
          tool={tool}
          initialContent={effectiveContent}
          hasOverride={Boolean(override)}
          updateAction={updateToolContent.bind(null, slug)}
          resetAction={resetToolContent.bind(null, slug)}
        />
      </div>
    </div>
  );
}
