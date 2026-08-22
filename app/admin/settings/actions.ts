"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getCurrentViewerAccess } from "@/lib/adminAuth";
import { setBannerSettings, setToolStatus, type BannerSettings } from "@/lib/appSettings";
import { logAdminAction } from "@/lib/auditLog";

async function requireFullAdmin() {
  const { user, access } = await getCurrentViewerAccess();
  if (!user || access.kind !== "admin") throw new Error("Not authorized.");
  return user;
}

export async function updateBanner(formData: FormData) {
  const user = await requireFullAdmin();

  const pagesMode = String(formData.get("pagesMode") ?? "all");
  const pages: BannerSettings["pages"] =
    pagesMode === "specific"
      ? String(formData.get("pagesList") ?? "")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
      : "all";

  const dismissDurationRaw = String(formData.get("dismissDurationDays") ?? "");
  const dismissDurationDays = dismissDurationRaw ? Number(dismissDurationRaw) : null;

  const startAtLocal = String(formData.get("startAt") ?? "").trim();
  const endAtLocal = String(formData.get("endAt") ?? "").trim();
  const startAt = startAtLocal ? new Date(startAtLocal).toISOString() : null;
  const endAt = endAtLocal ? new Date(endAtLocal).toISOString() : null;
  if (startAt && endAt && startAt >= endAt) throw new Error("The end date must be after the start date.");

  const ctaLabel = String(formData.get("ctaLabel") ?? "").trim() || null;
  const ctaUrl = String(formData.get("ctaUrl") ?? "").trim() || null;
  if (ctaLabel && !ctaUrl) throw new Error("Add a link for the button, or remove its label.");
  if (ctaUrl && !ctaLabel) throw new Error("Add a label for the button, or remove its link.");

  const banner: BannerSettings = {
    // A fresh id every save — the point is that editing a banner (even just
    // fixing a typo) shows it again to someone who already dismissed the
    // previous version (see components/SiteBanner.tsx's dismiss-state key).
    id: crypto.randomUUID(),
    message: String(formData.get("message") ?? "").trim(),
    type: (["info", "warning", "success"] as const).includes(formData.get("type") as BannerSettings["type"])
      ? (formData.get("type") as BannerSettings["type"])
      : "info",
    active: formData.get("active") === "on",
    size: (["sm", "md", "lg"] as const).includes(formData.get("size") as BannerSettings["size"])
      ? (formData.get("size") as BannerSettings["size"])
      : "md",
    pages,
    dismissible: formData.get("dismissible") === "on",
    dismissDurationDays,
    ctaLabel,
    ctaUrl,
    startAt,
    endAt,
  };

  await setBannerSettings(banner);
  await logAdminAction({
    actorId: user.id,
    actorEmail: user.email,
    action: "settings.banner_update",
    targetType: "banner",
    details: banner,
  });

  // updateTag (not revalidateTag) — this is a Server Action and we want the
  // admin to see the change take effect immediately, not the stale-while-
  // revalidate behavior revalidateTag would give.
  updateTag("banner");
  revalidatePath("/admin/settings");
}

export async function updateToolStatus(slug: string, formData: FormData) {
  const user = await requireFullAdmin();

  const disabled = formData.get("disabled") === "on";
  const message = String(formData.get("message") ?? "").trim();

  await setToolStatus(slug, { disabled, message: message || undefined });
  await logAdminAction({
    actorId: user.id,
    actorEmail: user.email,
    action: disabled ? "tool.disable" : "tool.enable",
    targetType: "tool",
    targetId: slug,
    details: { message: message || undefined },
  });

  updateTag("tool-status");
  revalidatePath("/admin/settings");
}
