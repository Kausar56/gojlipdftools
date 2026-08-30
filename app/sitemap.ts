import type { MetadataRoute } from "next";
import { tools } from "@/lib/tools";
import { getPublishedPosts } from "@/lib/blog";
import { getAllToolContentUpdatedAt } from "@/lib/toolContent";

const baseUrl = "https://www.gojli.com";

// Static pages, the homepage, and any tool that has never had its guide
// customized (see getAllToolContentUpdatedAt) don't have a real "content
// last changed" timestamp to report — using the build time instead (the
// previous behavior) told Google every single page changed on every single
// deploy, a freshness signal search engines discount as unreliable once they
// notice it never varies by page. This is deliberately a fixed date rather
// than `new Date()`: bump it by hand whenever this file's or lib/tools.ts's
// actual copy meaningfully changes, so it keeps meaning what it says.
const DEFAULT_CONTENT_DATE = new Date("2026-08-30");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const toolContentUpdatedAt = await getAllToolContentUpdatedAt();

  const toolRoutes: MetadataRoute.Sitemap = tools.map((tool) => {
    const overrideDate = toolContentUpdatedAt.get(tool.slug);
    return {
      url: `${baseUrl}/${tool.slug}`,
      lastModified: overrideDate ? new Date(overrideDate) : DEFAULT_CONTENT_DATE,
      changeFrequency: "monthly",
      priority: 0.8,
    };
  });

  const staticPages = [
    { path: "/about", changeFrequency: "monthly" as const, priority: 0.5 },
    { path: "/pricing", changeFrequency: "monthly" as const, priority: 0.6 },
    { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
    { path: "/terms", changeFrequency: "yearly" as const, priority: 0.3 },
    { path: "/blog", changeFrequency: "daily" as const, priority: 0.6 },
  ];
  const staticRoutes: MetadataRoute.Sitemap = staticPages.map((page) => ({
    url: `${baseUrl}${page.path}`,
    lastModified: DEFAULT_CONTENT_DATE,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  let blogRoutes: MetadataRoute.Sitemap = [];
  try {
    const posts = await getPublishedPosts();
    blogRoutes = posts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.updatedAt),
      changeFrequency: "monthly",
      priority: 0.6,
    }));
  } catch {
    // Supabase not configured at build time — skip blog routes rather than fail the sitemap.
  }

  return [
    {
      url: baseUrl,
      lastModified: DEFAULT_CONTENT_DATE,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...toolRoutes,
    ...staticRoutes,
    ...blogRoutes,
  ];
}
