import type { Metadata } from "next";
import type { Tool } from "./tools";
import { getEffectiveToolContent } from "./toolContent";

/**
 * Every tool page page.tsx previously built its own `{ title, description }`
 * metadata object by hand — that covers the <title> tag and meta description,
 * but Next.js's metadata API does NOT cascade a page's own title/description
 * into openGraph/twitter fields automatically, so every tool page's social
 * preview card was falling back to the root layout's generic site-wide text
 * instead of the specific tool's name. This also fills in `alternates.canonical`,
 * which no page was setting at all.
 *
 * Async — pulls the admin-editable SEO title/description override (see
 * lib/toolContent.ts, app/admin/tool-content) so every tool page's
 * `generateMetadata` must be an async function calling this, not a static
 * `export const metadata = ...`. seoTitle already excludes the "| Gojli"
 * suffix — the root layout's title template (app/layout.tsx) appends it.
 */
export async function toolMetadata(tool: Tool): Promise<Metadata> {
  const content = await getEffectiveToolContent(tool);
  const title = content.seoTitle;
  const description = content.seoDescription;
  return {
    title,
    description,
    alternates: { canonical: `/${tool.slug}` },
    openGraph: {
      title,
      description,
      url: `/${tool.slug}`,
    },
    twitter: {
      title,
      description,
    },
  };
}
