import { unstable_cache } from "next/cache";
import { createAdminClient } from "./supabase/admin";
import type { Tool, ToolGuideStep } from "./tools";

export type ToolFaqOverride = { question: string; answerHtml: string };

export type ToolContentOverride = {
  guideTitle: string | null;
  guideHtml: string | null;
  faqs: ToolFaqOverride[] | null;
  seoTitle: string | null;
  seoDescription: string | null;
  pageHeading: string | null;
};

export type EffectiveToolContent = {
  guideTitle: string;
  guideHtml: string;
  faqs: ToolFaqOverride[];
  // <title> tag content and meta description — see lib/seo.ts's
  // toolMetadata(), the only consumer. Always resolved (falls back to
  // tool.name/tool.heroDescription), unlike the override fields above.
  seoTitle: string;
  seoDescription: string;
  // The on-page <h1> shown above the workspace (components/ToolPageLayout.tsx)
  // — deliberately separate from seoTitle: the <title> tag can be more
  // keyword-heavy for search snippets, while the visible H1 usually reads
  // better a little shorter/plainer. Falls back to tool.name.
  pageHeading: string;
  // lib/tools.ts's guideSteps when the guide is still the default synthesized
  // one; null once an admin has written their own free-form guide_html,
  // since that replaces the steps entirely and they'd no longer describe
  // what's actually on the page. Used for this tool's HowTo structured data
  // (see components/ToolPageLayout.tsx) — structured data that doesn't match
  // the visible content is a real risk (Google treats it as spam), so this
  // is the one place that decides whether the steps are still trustworthy.
  guideSteps: ToolGuideStep[] | null;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Strips tags back to plain text — used only for JSON-LD structured data,
 *  which expects plain text values, not markup, for fields like
 *  Answer.text. Doesn't need to be perfect, just readable — search engines
 *  don't render it. */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Before any admin has written a custom article for a tool, its guide
 *  falls back to a synthesized one built from lib/tools.ts's existing
 *  guideIntro paragraph + guideSteps list — so nothing regresses to a blank
 *  section for the 40+ tools nobody has edited yet. Once an admin writes
 *  their own article via the single rich text editor, this is fully
 *  replaced (not merged) by their HTML. */
function defaultGuideHtml(tool: Tool): string {
  const introHtml = `<p>${escapeHtml(tool.guideIntro)}</p>`;
  if (tool.guideSteps.length === 0) return introHtml;

  const stepsHtml = tool.guideSteps
    .map((step) => `<li><strong>${escapeHtml(step.title)}</strong> — ${escapeHtml(step.description)}</li>`)
    .join("");
  return `${introHtml}<ol>${stepsHtml}</ol>`;
}

// The service-role client (no next/headers cookies() dependency) on purpose
// — this reads on every tool-page view, so touching cookies() here would
// force every tool page into dynamic rendering instead of staying
// statically prerenderable (see lib/appSettings.ts for the same reasoning).
async function readToolContentOverrideFresh(slug: string): Promise<ToolContentOverride | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("tool_content")
      .select("guide_title, guide_html, faqs, seo_title, seo_description, page_heading")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return null;
    return {
      guideTitle: (data.guide_title as string | null) ?? null,
      guideHtml: (data.guide_html as string | null) ?? null,
      faqs: (data.faqs as ToolFaqOverride[] | null) ?? null,
      seoTitle: (data.seo_title as string | null) ?? null,
      seoDescription: (data.seo_description as string | null) ?? null,
      pageHeading: (data.page_heading as string | null) ?? null,
    };
  } catch {
    // Table not created yet (docs/tool-content-schema.sql not run) or
    // Supabase env vars missing — tool pages must still render their
    // hardcoded defaults rather than 500.
    return null;
  }
}

// Cached with a short TTL as a safety net; the write actions call
// updateTag() for near-instant invalidation, so this mostly guards against a
// missed/failed revalidation. Keyed by slug so each tool gets its own cache
// entry instead of one giant shared one.
function getCachedToolContentOverride(slug: string): Promise<ToolContentOverride | null> {
  return unstable_cache(() => readToolContentOverrideFresh(slug), ["tool-content", slug], {
    revalidate: 60,
    tags: ["tool-content", `tool-content:${slug}`],
  })();
}

/** Merges an admin-set override (if any) over a tool's hardcoded defaults
 *  from lib/tools.ts — the guide article and the FAQ list are each
 *  independently optional, so an admin can override just one and leave the
 *  other as-is. Always returns HTML (plain-text FAQ defaults get escaped
 *  and paragraph-wrapped) so the renderer never needs to care which source
 *  a given field came from. */
export async function getEffectiveToolContent(tool: Tool): Promise<EffectiveToolContent> {
  const override = await getCachedToolContentOverride(tool.slug);

  return {
    guideTitle: override?.guideTitle || `How ${tool.name} works`,
    guideHtml: override?.guideHtml || defaultGuideHtml(tool),
    faqs:
      override?.faqs && override.faqs.length > 0
        ? override.faqs
        : tool.faqs.map((faq) => ({ question: faq.question, answerHtml: `<p>${escapeHtml(faq.answer)}</p>` })),
    guideSteps: override?.guideHtml ? null : tool.guideSteps,
    seoTitle: override?.seoTitle || tool.name,
    seoDescription: override?.seoDescription || tool.heroDescription,
    pageHeading: override?.pageHeading || tool.name,
  };
}

/** Admin edit screen wants the freshest row (not the cached read used by
 *  public tool pages) so it never shows stale content right after a save. */
export async function getToolContentOverrideForEdit(slug: string): Promise<ToolContentOverride | null> {
  return readToolContentOverrideFresh(slug);
}

/** Every tool that has a custom guide/FAQ override, and when it was last
 *  actually edited — used by app/sitemap.ts so a tool's <lastmod> reflects a
 *  real content change instead of just "whenever the site was last built".
 *  A tool with no row here still shows its lib/tools.ts default copy, so its
 *  sitemap entry falls back to a fixed baseline date instead (see
 *  DEFAULT_CONTENT_DATE in app/sitemap.ts). */
export async function getAllToolContentUpdatedAt(): Promise<Map<string, string>> {
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("tool_content").select("slug, updated_at");
    return new Map((data ?? []).map((row) => [row.slug as string, row.updated_at as string]));
  } catch {
    // Table not created yet or Supabase env vars missing — the sitemap
    // still needs to build, just without any per-tool override dates.
    return new Map();
  }
}

export async function setToolContentOverride(slug: string, content: ToolContentOverride): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("tool_content").upsert({
    slug,
    guide_title: content.guideTitle,
    guide_html: content.guideHtml,
    faqs: content.faqs,
    seo_title: content.seoTitle,
    seo_description: content.seoDescription,
    page_heading: content.pageHeading,
  });
  if (error) throw new Error(error.message);
}

export async function resetToolContentOverride(slug: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("tool_content").delete().eq("slug", slug);
  if (error) throw new Error(error.message);
}
