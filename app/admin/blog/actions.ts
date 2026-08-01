"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sanitizeHtml from "sanitize-html";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/adminAuth";
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

async function requireAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user || !isAdminEmail(data.user.email)) {
    throw new Error("Not authorized.");
  }
  return data.user;
}

function readFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const excerpt = String(formData.get("excerpt") ?? "").trim();
  const contentHtmlRaw = String(formData.get("contentHtml") ?? "");
  const thumbnailUrl = String(formData.get("thumbnailUrl") ?? "").trim();
  const thumbnailPublicId = String(formData.get("thumbnailPublicId") ?? "").trim();
  const status = formData.get("status") === "published" ? "published" : "draft";
  const metaTitle = String(formData.get("metaTitle") ?? "").trim();
  const metaDescription = String(formData.get("metaDescription") ?? "").trim();
  const tagsInput = String(formData.get("tags") ?? "");
  const tags = tagsInput
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

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
    status: status as "draft" | "published",
    metaTitle: metaTitle || null,
    metaDescription: metaDescription || null,
    tags,
  };
}

export async function createPost(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await requireAdmin();
    const fields = readFields(formData);
    const admin = createAdminClient();

    const { error } = await admin.from("blog_posts").insert({
      title: fields.title,
      slug: fields.slug,
      excerpt: fields.excerpt,
      content_html: fields.contentHtml,
      thumbnail_url: fields.thumbnailUrl,
      thumbnail_public_id: fields.thumbnailPublicId,
      status: fields.status,
      author_id: user.id,
      author_name: (user.user_metadata?.full_name as string | undefined) || user.email || null,
      meta_title: fields.metaTitle,
      meta_description: fields.metaDescription,
      tags: fields.tags,
      published_at: fields.status === "published" ? new Date().toISOString() : null,
    });

    if (error) {
      return {
        error: error.code === "23505" ? `A post with the slug "${fields.slug}" already exists.` : error.message,
      };
    }
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
    await requireAdmin();
    const fields = readFields(formData);
    const admin = createAdminClient();

    const existing = await admin
      .from("blog_posts")
      .select("status, published_at, thumbnail_public_id")
      .eq("id", id)
      .maybeSingle();
    const wasPublished = existing.data?.status === "published";
    const publishedAt =
      fields.status === "published" ? (wasPublished ? existing.data?.published_at : new Date().toISOString()) : null;
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
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong." };
  }

  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  redirect(`/admin/blog/${id}`);
}

export async function deletePost(id: string) {
  await requireAdmin();
  const admin = createAdminClient();

  const existing = await admin.from("blog_posts").select("thumbnail_public_id").eq("id", id).maybeSingle();
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

  revalidatePath("/blog");
  redirect("/admin/blog");
}
