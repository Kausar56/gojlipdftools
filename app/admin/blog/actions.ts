"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sanitizeHtml from "sanitize-html";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentViewerAccess, hasPermission } from "@/lib/adminAuth";
import { logAdminAction } from "@/lib/auditLog";
import { slugify } from "@/lib/blog";
import { deleteUploadedImage } from "@/lib/cloudinary";

export type ActionState = { error?: string };

// Only admins ever author posts, but this still sanitizes before storage —
// the trust boundary is "whatever the rich text editor's HTML happens to
// contain", not the admin themselves, and this is the one place raw HTML
// from that editor ever gets written to the database.
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1", "h2", "h3", "h4", "p", "br", "hr",
    "b", "strong", "i", "em", "s", "strike", "u", "code", "pre",
    "blockquote", "ul", "ol", "li", "a", "img",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "title"],
  },
  allowedSchemes: ["http", "https", "data"],
};

// Any real admin can do anything below; a moderator needs both the specific
// permission and (for edit/delete) to be the post's own author — see
// lib/adminAuth.ts and lib/permissions.ts for how that's granted.
async function requireViewer() {
  const { user, access } = await getCurrentViewerAccess();
  if (!user || access.kind === "none") throw new Error("Not authorized.");
  return { user, access };
}

function readFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const excerpt = String(formData.get("excerpt") ?? "").trim();
  const contentHtmlRaw = String(formData.get("contentHtml") ?? "");
  const thumbnailUrl = String(formData.get("thumbnailUrl") ?? "").trim();
  const thumbnailPublicId = String(formData.get("thumbnailPublicId") ?? "").trim();
  const statusRaw = formData.get("status");
  const status: "draft" | "scheduled" | "published" =
    statusRaw === "published" ? "published" : statusRaw === "scheduled" ? "scheduled" : "draft";
  const metaTitle = String(formData.get("metaTitle") ?? "").trim();
  const metaDescription = String(formData.get("metaDescription") ?? "").trim();
  const tagsInput = String(formData.get("tags") ?? "");
  const tags = tagsInput
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  // <input type="datetime-local"> has no timezone info — parsed as the
  // server's local time, which won't always match the admin's own browser
  // timezone. Acceptable for a first version; a real timezone picker would
  // be needed to make this exact across regions.
  const scheduledAtLocal = String(formData.get("scheduledAt") ?? "").trim();
  const scheduledAt = scheduledAtLocal ? new Date(scheduledAtLocal).toISOString() : null;
  if (status === "scheduled" && !scheduledAt) throw new Error("Pick a date and time to schedule this post for.");

  if (!title) throw new Error("Title is required.");

  const slug = slugify(slugInput || title);
  if (!slug) throw new Error("Couldn't generate a valid slug from the title.");

  return {
    title,
    slug,
    excerpt: excerpt || null,
    contentHtml: sanitizeHtml(contentHtmlRaw, SANITIZE_OPTIONS),
    thumbnailUrl: thumbnailUrl || null,
    thumbnailPublicId: thumbnailPublicId || null,
    status,
    scheduledAt,
    metaTitle: metaTitle || null,
    metaDescription: metaDescription || null,
    tags,
  };
}

export async function createPost(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const { user, access } = await requireViewer();
    if (!hasPermission(access, "blog:create")) throw new Error("You don't have permission to create blog posts.");
    const fields = readFields(formData);
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("blog_posts")
      .insert({
        title: fields.title,
        slug: fields.slug,
        excerpt: fields.excerpt,
        content_html: fields.contentHtml,
        thumbnail_url: fields.thumbnailUrl,
        thumbnail_public_id: fields.thumbnailPublicId,
        status: fields.status,
        author_id: user.id,
        author_name: user.fullName || user.email || null,
        meta_title: fields.metaTitle,
        meta_description: fields.metaDescription,
        tags: fields.tags,
        scheduled_at: fields.status === "scheduled" ? fields.scheduledAt : null,
        published_at: fields.status === "published" ? new Date().toISOString() : null,
      })
      .select("id")
      .single();

    if (error) {
      return {
        error: error.code === "23505" ? `A post with the slug "${fields.slug}" already exists.` : error.message,
      };
    }

    await logAdminAction({
      actorId: user.id,
      actorEmail: user.email,
      action: "blog.create",
      targetType: "blog_post",
      targetId: data?.id,
      details: { title: fields.title, status: fields.status },
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong." };
  }

  // redirect() throws internally — kept outside the try/catch above so that
  // throw isn't swallowed as if it were a real error (see app/login/page.tsx
  // for the same bug fixed the same way).
  revalidatePath("/blog");
  redirect("/admin/blog");
}

export async function updatePost(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let slug: string;
  try {
    const { user, access } = await requireViewer();
    const admin = createAdminClient();

    const existing = await admin
      .from("blog_posts")
      .select("status, published_at, thumbnail_public_id, author_id")
      .eq("id", id)
      .maybeSingle();

    const isOwnPost = existing.data?.author_id === user.id;
    const canEdit = access.kind === "admin" || (hasPermission(access, "blog:edit_own") && isOwnPost);
    if (!canEdit) throw new Error("You don't have permission to edit this post.");

    const fields = readFields(formData);
    const wasPublished = existing.data?.status === "published";
    const publishedAt =
      fields.status === "published" ? (wasPublished ? existing.data?.published_at : new Date().toISOString()) : null;
    const scheduledAt = fields.status === "scheduled" ? fields.scheduledAt : null;
    const oldThumbnailPublicId = existing.data?.thumbnail_public_id ?? null;

    const { error } = await admin
      .from("blog_posts")
      .update({
        title: fields.title,
        slug: fields.slug,
        excerpt: fields.excerpt,
        content_html: fields.contentHtml,
        thumbnail_url: fields.thumbnailUrl,
        thumbnail_public_id: fields.thumbnailPublicId,
        status: fields.status,
        meta_title: fields.metaTitle,
        meta_description: fields.metaDescription,
        tags: fields.tags,
        scheduled_at: scheduledAt,
        published_at: publishedAt,
      })
      .eq("id", id);

    if (error) {
      return {
        error: error.code === "23505" ? `A post with the slug "${fields.slug}" already exists.` : error.message,
      };
    }
    slug = fields.slug;

    // Thumbnail was replaced or cleared — the old Cloudinary asset is now
    // orphaned, so clean it up. Best-effort: a failure here shouldn't block
    // the save that already succeeded.
    if (oldThumbnailPublicId && oldThumbnailPublicId !== fields.thumbnailPublicId) {
      await deleteUploadedImage(oldThumbnailPublicId).catch((cleanupError) => {
        console.error("Failed to delete old blog thumbnail from Cloudinary:", cleanupError);
      });
    }

    await logAdminAction({
      actorId: user.id,
      actorEmail: user.email,
      action: "blog.update",
      targetType: "blog_post",
      targetId: id,
      details: { title: fields.title, status: fields.status },
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong." };
  }

  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  redirect(`/admin/blog/${id}`);
}

export async function deletePost(id: string) {
  const { user, access } = await requireViewer();
  const admin = createAdminClient();

  const existing = await admin.from("blog_posts").select("thumbnail_public_id, author_id").eq("id", id).maybeSingle();

  const isOwnPost = existing.data?.author_id === user.id;
  const canDelete = access.kind === "admin" || (hasPermission(access, "blog:delete_own") && isOwnPost);
  if (!canDelete) throw new Error("You don't have permission to delete this post.");

  const thumbnailPublicId = existing.data?.thumbnail_public_id ?? null;

  const { error } = await admin.from("blog_posts").delete().eq("id", id);
  if (error) throw new Error(error.message);

  // Best-effort: the post is already gone from the DB either way, so a
  // Cloudinary hiccup here shouldn't turn into an error for the admin.
  if (thumbnailPublicId) {
    await deleteUploadedImage(thumbnailPublicId).catch((cleanupError) => {
      console.error("Failed to delete blog thumbnail from Cloudinary:", cleanupError);
    });
  }

  await logAdminAction({
    actorId: user.id,
    actorEmail: user.email,
    action: "blog.delete",
    targetType: "blog_post",
    targetId: id,
  });

  revalidatePath("/blog");
  redirect("/admin/blog");
}
