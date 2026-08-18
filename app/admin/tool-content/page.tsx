import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentViewerAccess } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { tools } from "@/lib/tools";
import { ToolContentList } from "@/components/ToolContentList";

export const metadata: Metadata = { title: "Tool Content" };
export const dynamic = "force-dynamic";

export default async function ToolContentListPage() {
  const { access } = await getCurrentViewerAccess();
  if (access.kind !== "admin") redirect("/admin/blog");

  let customizedSlugs: string[] = [];
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("tool_content").select("slug");
    customizedSlugs = (data ?? []).map((row) => row.slug as string);
  } catch {
    // Table not created yet (docs/tool-content-schema.sql not run) — every
    // tool just shows as using its default content.
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-base-content">Tool Content</h1>
      <p className="mt-1 text-sm text-base-content/60">
        Edit the &quot;How it works&quot; guide and FAQ text shown below each tool&apos;s workspace.
      </p>

      <div className="mt-4">
        <ToolContentList tools={tools} customizedSlugs={customizedSlugs} />
      </div>
    </div>
  );
}
