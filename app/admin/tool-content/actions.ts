"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getCurrentViewerAccess, hasPermission } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/auditLog";
import { sanitizeRichTextHtml } from "@/lib/sanitizeRichText";
import { setToolContentOverride, resetToolContentOverride, type ToolContentOverride, type ToolFaqOverride } from "@/lib/toolContent";
import { getToolBySlug } from "@/lib/tools";

// Global, cross-visitor content shown on the public tool page — a real
// admin always has it; a moderator needs the "tool_content:edit" permission
// granted explicitly (see app/admin/moderators). Unlike blog, there's no
// "own content only" restriction here — a moderator with this permission
// can edit any tool's guide/FAQ.
async function requireToolContentAccess() {
  const { user, access } = await getCurrentViewerAccess();
  if (!user || !hasPermission(access, "tool_content:edit")) throw new Error("Not authorized.");
  return user;
}

export async function updateToolContent(slug: string, formData: FormData) {
  const user = await requireToolContentAccess();
  if (!getToolBySlug(slug)) throw new Error("Unknown tool.");

  const guideTitle = String(formData.get("guideTitle") ?? "").trim();
  const guideHtml = sanitizeRichTextHtml(String(formData.get("guideHtml") ?? ""));

  const faqQuestions = formData.getAll("faqQuestion").map(String);
  const faqAnswers = formData.getAll("faqAnswerHtml").map(String);
  const faqs = faqQuestions
    .map((question, i) => ({ question: question.trim(), answerHtml: sanitizeRichTextHtml(faqAnswers[i] ?? "") }))
    .filter((faq) => faq.question || faq.answerHtml);

  const seoTitle = String(formData.get("seoTitle") ?? "").trim();
  const seoDescription = String(formData.get("seoDescription") ?? "").trim();

  const content: ToolContentOverride = {
    guideTitle: guideTitle || null,
    guideHtml: guideHtml || null,
    faqs: faqs.length > 0 ? faqs : null,
    seoTitle: seoTitle || null,
    seoDescription: seoDescription || null,
  };

  await setToolContentOverride(slug, content);
  await logAdminAction({
    actorId: user.id,
    actorEmail: user.email,
    action: "tool_content.update",
    targetType: "tool",
    targetId: slug,
  });

  updateTag(`tool-content:${slug}`);
  updateTag("tool-content");
  revalidatePath(`/${slug}`);
  revalidatePath(`/admin/tool-content/${slug}`);
}

/** Same one-time cleanup as app/admin/blog/actions.ts's
 *  cleanupNonBreakingSpaces, for tool guide/FAQ overrides instead of blog
 *  posts — see that function's comment for why this exists. Only tools with
 *  a saved override are checked; a tool still showing its lib/tools.ts
 *  default has hand-written copy, never pasted, so it was never at risk. */
export async function cleanupToolContentWhitespace(): Promise<{ fixed: number; checked: number }> {
  const { access } = await getCurrentViewerAccess();
  if (access.kind !== "admin") throw new Error("Not authorized.");

  const admin = createAdminClient();
  const { data: rows, error } = await admin.from("tool_content").select("slug, guide_html, faqs");
  if (error) throw new Error(error.message);

  let fixed = 0;
  for (const row of rows ?? []) {
    const originalGuideHtml = (row.guide_html as string | null) ?? null;
    const cleanedGuideHtml = originalGuideHtml ? sanitizeRichTextHtml(originalGuideHtml) : originalGuideHtml;

    const originalFaqs = (row.faqs as ToolFaqOverride[] | null) ?? null;
    const cleanedFaqs = originalFaqs
      ? originalFaqs.map((faq) => ({ ...faq, answerHtml: sanitizeRichTextHtml(faq.answerHtml) }))
      : originalFaqs;

    const guideChanged = cleanedGuideHtml !== originalGuideHtml;
    const faqsChanged = JSON.stringify(cleanedFaqs) !== JSON.stringify(originalFaqs);
    if (!guideChanged && !faqsChanged) continue;

    const { error: updateError } = await admin
      .from("tool_content")
      .update({ guide_html: cleanedGuideHtml, faqs: cleanedFaqs })
      .eq("slug", row.slug as string);
    if (updateError) throw new Error(updateError.message);
    fixed++;
    updateTag(`tool-content:${row.slug}`);
  }

  if (fixed > 0) updateTag("tool-content");

  return { fixed, checked: (rows ?? []).length };
}

export async function resetToolContent(slug: string) {
  const user = await requireToolContentAccess();

  await resetToolContentOverride(slug);
  await logAdminAction({
    actorId: user.id,
    actorEmail: user.email,
    action: "tool_content.reset",
    targetType: "tool",
    targetId: slug,
  });

  updateTag(`tool-content:${slug}`);
  updateTag("tool-content");
  revalidatePath(`/${slug}`);
  revalidatePath(`/admin/tool-content/${slug}`);
}
