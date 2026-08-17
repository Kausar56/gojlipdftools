import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentViewerAccess } from "@/lib/adminAuth";
import { getAllTagsWithCounts } from "@/lib/blogTags";
import { TagManager } from "@/components/TagManager";
import { renameTag, deleteTag } from "./actions";

export const metadata: Metadata = { title: "Tags" };
export const dynamic = "force-dynamic";

export default async function TagsPage() {
  const { access } = await getCurrentViewerAccess();
  if (access.kind !== "admin") redirect("/admin/blog");

  const tags = await getAllTagsWithCounts();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-base-content">Tags</h1>
      <p className="mt-1 text-sm text-base-content/60">Rename or remove a tag across every post that uses it.</p>

      <div className="mt-4">
        <TagManager tags={tags} renameAction={renameTag} deleteAction={deleteTag} />
      </div>
    </div>
  );
}
