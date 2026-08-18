"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getCurrentViewerAccess, hasPermission } from "@/lib/adminAuth";
import { logAdminAction } from "@/lib/auditLog";
import { sanitizeRichTextHtml } from "@/lib/sanitizeRichText";
import { setToolContentOverride, resetToolContentOverride, type ToolContentOverride } from "@/lib/toolContent";
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

  const content: ToolContentOverride = {
    guideTitle: guideTitle || null,
    guideHtml: guideHtml || null,
    faqs: faqs.length > 0 ? faqs : null,
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
