import { unstable_cache } from "next/cache";
import { createAdminClient } from "./supabase/admin";

export type ToolStatusMap = Record<string, { disabled: boolean; message?: string }>;

export type BannerSettings = {
  message: string;
  type: "info" | "warning" | "success";
  active: boolean;
};

const TOOL_STATUS_KEY = "tool_status";
const BANNER_KEY = "banner";

// The service-role client (no next/headers cookies() dependency) on purpose:
// this reads on every tool-page view and the root layout, so touching
// cookies() here would force every page in the app into dynamic rendering
// (see caching-without-cache-components.md) instead of staying statically
// prerenderable. app_settings only holds non-sensitive site config, so
// bypassing RLS for this specific read is an acceptable trade.
async function readToolStatusMapFresh(): Promise<ToolStatusMap> {
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("app_settings").select("value").eq("key", TOOL_STATUS_KEY).maybeSingle();
    return (data?.value as ToolStatusMap | undefined) ?? {};
  } catch {
    // Table not created yet (docs/admin-features-schema.sql not run) or
    // Supabase env vars missing — every tool page must still render.
    return {};
  }
}

async function readBannerFresh(): Promise<BannerSettings | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("app_settings").select("value").eq("key", BANNER_KEY).maybeSingle();
    return (data?.value as BannerSettings | undefined) ?? null;
  } catch {
    return null;
  }
}

// Cached with a short TTL as a safety net; the write actions below call
// revalidateTag() for near-instant invalidation, so this mostly guards
// against a missed/failed revalidation rather than being the primary
// freshness mechanism.
const getCachedToolStatusMap = unstable_cache(readToolStatusMapFresh, ["tool-status"], {
  revalidate: 60,
  tags: ["tool-status"],
});
const getCachedBanner = unstable_cache(readBannerFresh, ["banner"], { revalidate: 60, tags: ["banner"] });

export async function getToolStatusMap(): Promise<ToolStatusMap> {
  return getCachedToolStatusMap();
}

export async function getBannerSettings(): Promise<BannerSettings | null> {
  return getCachedBanner();
}

/** Admin-only writes — merges into the existing map rather than replacing it
 *  wholesale, so toggling one tool never clobbers another tool's saved state
 *  from a stale form submission. Reads the fresh (uncached) map so a rapid
 *  edit right after another one can't merge against a stale cached copy. */
export async function setToolStatus(slug: string, status: { disabled: boolean; message?: string }): Promise<void> {
  const admin = createAdminClient();
  const current = await readToolStatusMapFresh();
  const next: ToolStatusMap = { ...current };
  if (!status.disabled && !status.message) {
    delete next[slug];
  } else {
    next[slug] = status;
  }
  const { error } = await admin.from("app_settings").upsert({ key: TOOL_STATUS_KEY, value: next });
  if (error) throw new Error(error.message);
}

export async function setBannerSettings(banner: BannerSettings): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("app_settings").upsert({ key: BANNER_KEY, value: banner });
  if (error) throw new Error(error.message);
}
