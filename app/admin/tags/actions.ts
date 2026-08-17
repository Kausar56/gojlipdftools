"use server";

import { revalidatePath } from "next/cache";
import { getCurrentViewerAccess } from "@/lib/adminAuth";
import { logAdminAction } from "@/lib/auditLog";
import { renameTagEverywhere, deleteTagEverywhere } from "@/lib/blogTags";

// Global tag rename/delete touches posts regardless of who authored them —
// not something a moderator's "own posts only" permissions should extend to.
async function requireFullAdmin() {
  const { user, access } = await getCurrentViewerAccess();
  if (!user || access.kind !== "admin") throw new Error("Not authorized.");
  return user;
}

export async function renameTag(oldTag: string, formData: FormData) {
  const actor = await requireFullAdmin();
  const newTag = String(formData.get("newTag") ?? "").trim();
  if (!newTag) throw new Error("New tag name can't be empty.");

  const postsAffected = await renameTagEverywhere(oldTag, newTag);
  await logAdminAction({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "blog.tag_rename",
    targetType: "tag",
    targetId: oldTag,
    details: { newTag, postsAffected },
  });

  revalidatePath("/admin/tags");
  revalidatePath("/blog");
}

export async function deleteTag(tag: string) {
  const actor = await requireFullAdmin();

  const postsAffected = await deleteTagEverywhere(tag);
  await logAdminAction({
    actorId: actor.id,
    actorEmail: actor.email,
    action: "blog.tag_delete",
    targetType: "tag",
    targetId: tag,
    details: { postsAffected },
  });

  revalidatePath("/admin/tags");
  revalidatePath("/blog");
}
