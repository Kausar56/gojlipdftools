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

  const banner: BannerSettings = {
    message: String(formData.get("message") ?? "").trim(),
    type: (["info", "warning", "success"] as const).includes(formData.get("type") as BannerSettings["type"])
      ? (formData.get("type") as BannerSettings["type"])
      : "info",
    active: formData.get("active") === "on",
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
