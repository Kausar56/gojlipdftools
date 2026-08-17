import { createAdminClient } from "./supabase/admin";

export type TagUsage = { tag: string; count: number };

/** Admin-only — tags live only as a text[] column on blog_posts (no separate
 *  tags table), so "all tags" means aggregating that column across every
 *  post in memory, same pattern as adminStats.ts's by-tool counts. */
export async function getAllTagsWithCounts(): Promise<TagUsage[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("blog_posts").select("tags");

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    for (const tag of (row.tags as string[] | null) ?? []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
}

/** Renames a tag on every post that has it, merging into an existing tag of
 *  the new name if one's already present (no duplicate entries in a post's
 *  tags array). Returns how many posts were touched. */
export async function renameTagEverywhere(oldTag: string, newTag: string): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin.from("blog_posts").select("id, tags").contains("tags", [oldTag]);
  const rows = data ?? [];

  for (const row of rows) {
    const tags = Array.from(new Set(((row.tags as string[] | null) ?? []).map((tag) => (tag === oldTag ? newTag : tag))));
    await admin.from("blog_posts").update({ tags }).eq("id", row.id);
  }

  return rows.length;
}

/** Removes a tag from every post that has it (the post itself isn't
 *  touched otherwise). Returns how many posts were affected. */
export async function deleteTagEverywhere(tag: string): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin.from("blog_posts").select("id, tags").contains("tags", [tag]);
  const rows = data ?? [];

  for (const row of rows) {
    const tags = ((row.tags as string[] | null) ?? []).filter((t) => t !== tag);
    await admin.from("blog_posts").update({ tags }).eq("id", row.id);
  }

  return rows.length;
}
