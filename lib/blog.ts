import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";

export { slugify } from "./blogSlug";

export type BlogPostStatus = "draft" | "published";

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  contentHtml: string;
  thumbnailUrl: string | null;
  thumbnailPublicId: string | null;
  status: BlogPostStatus;
  authorId: string | null;
  authorName: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  tags: string[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type BlogPostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content_html: string;
  thumbnail_url: string | null;
  thumbnail_public_id: string | null;
  status: string;
  author_id: string | null;
  author_name: string | null;
  meta_title: string | null;
  meta_description: string | null;
  tags: string[] | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

function fromRow(row: BlogPostRow): BlogPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    contentHtml: row.content_html,
    thumbnailUrl: row.thumbnail_url,
    thumbnailPublicId: row.thumbnail_public_id,
    status: row.status === "published" ? "published" : "draft",
    authorId: row.author_id,
    authorName: row.author_name,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    tags: row.tags ?? [],
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Public reads go through the regular per-request client (respects RLS,
 *  which only exposes `status = 'published'` rows) — no need for the
 *  service-role client here, unlike the admin CRUD paths. The byline comes
 *  from the denormalized `author_name` column for the same reason: resolving
 *  it via the auth admin API would drag a service-role dependency into the
 *  public read path. */
export async function getPublishedPosts(): Promise<BlogPost[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  return (data as BlogPostRow[] | null ?? []).map(fromRow);
}

export async function getPublishedPostBySlug(slug: string): Promise<BlogPost | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle();
  return data ? fromRow(data as BlogPostRow) : null;
}

/** Admin-only — uses the service-role client so drafts are visible too. */
export async function getAllPostsForAdmin(): Promise<BlogPost[]> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("blog_posts").select("*").order("created_at", { ascending: false });
  return (data as BlogPostRow[] | null ?? []).map(fromRow);
}

export async function getPostByIdForAdmin(id: string): Promise<BlogPost | null> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("blog_posts").select("*").eq("id", id).maybeSingle();
  return data ? fromRow(data as BlogPostRow) : null;
}

/** Plain-text word count from the sanitized HTML, used for both an
 *  on-page "X min read" hint and (roughly) `wordCount` in JSON-LD. */
export function estimateReadingMinutes(contentHtml: string): number {
  const text = contentHtml.replace(/<[^>]*>/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
