import type { MetadataRoute } from "next";
import { tools } from "@/lib/tools";
import { getPublishedPosts } from "@/lib/blog";

const baseUrl = "https://www.gojli.com";

const staticPages = [
  { path: "/about", changeFrequency: "monthly" as const, priority: 0.5 },
  { path: "/pricing", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/blog", changeFrequency: "daily" as const, priority: 0.6 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const toolRoutes: MetadataRoute.Sitemap = tools.map((tool) => ({
    url: `${baseUrl}/${tool.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const staticRoutes: MetadataRoute.Sitemap = staticPages.map((page) => ({
    url: `${baseUrl}${page.path}`,
    lastModified: new Date(),
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
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...toolRoutes,
    ...staticRoutes,
    ...blogRoutes,
  ];
}
