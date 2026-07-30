import type { Metadata } from "next";
import type { Tool } from "./tools";

/**
 * Every tool page page.tsx previously built its own `{ title, description }`
 * metadata object by hand — that covers the <title> tag and meta description,
 * but Next.js's metadata API does NOT cascade a page's own title/description
 * into openGraph/twitter fields automatically, so every tool page's social
 * preview card was falling back to the root layout's generic site-wide text
 * instead of the specific tool's name. This also fills in `alternates.canonical`,
 * which no page was setting at all.
 */
export function toolMetadata(tool: Tool): Metadata {
  return {
    title: tool.name,
    description: tool.heroDescription,
    alternates: { canonical: `/${tool.slug}` },
    openGraph: {
      title: tool.name,
      description: tool.heroDescription,
      url: `/${tool.slug}`,
    },
    twitter: {
      title: tool.name,
      description: tool.heroDescription,
    },
  };
}
