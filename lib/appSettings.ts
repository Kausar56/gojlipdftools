import { unstable_cache } from "next/cache";
import { createAdminClient } from "./supabase/admin";

export type ToolStatusMap = Record<string, { disabled: boolean; message?: string }>;

export type BannerSize = "sm" | "md" | "lg";

export type BannerSettings = {
  // Regenerated on every save (see setBannerSettings) — the dismiss-state
  // key a visitor's browser stores (see components/SiteBanner.tsx), so
  // editing and re-publishing a banner shows it again even to someone who
  // already dismissed the previous version.
  id: string;
  message: string;
  type: "info" | "warning" | "success";
  active: boolean;
  size: BannerSize;
  // "all" (every non-admin page) or an explicit allow-list of exact paths
  // ("/" for the homepage, "/merge-pdf", etc.) — see components/SiteBanner.tsx.
  // The admin panel is excluded unconditionally regardless of this setting.
  pages: "all" | string[];
  dismissible: boolean;
  // null = only for the current page load (no persistence — a refresh brings
  // it back); a number = persisted that many days via localStorage.
  dismissDurationDays: number | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  // ISO 8601, or null for no bound on that side.
  startAt: string | null;
  endAt: string | null;
};

const TOOL_STATUS_KEY = "tool_status";
const BANNER_KEY = "banner";

const DEFAULT_BANNER_EXTRAS = {
  size: "md" as BannerSize,
  pages: "all" as const,
  dismissible: true,
  dismissDurationDays: null,
  ctaLabel: null,
  ctaUrl: null,
  startAt: null,
  endAt: null,
};

/** Backfills fields that didn't exist on a banner saved before this feature
 *  set was added — app_settings.value is a schemaless JSON blob, so an old
 *  row simply won't have them. Without this, every consumer would need its
 *  own `??` fallback chain, and it's easy to miss one. */
function normalizeBanner(raw: Partial<BannerSettings> | null | undefined): BannerSettings | null {
  if (!raw || !raw.message) return null;
  return {
    ...DEFAULT_BANNER_EXTRAS,
    ...raw,
    id: raw.id ?? "legacy",
    message: raw.message,
    type: raw.type ?? "info",
    active: raw.active ?? false,
  };
}

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
    return normalizeBanner(data?.value as Partial<BannerSettings> | undefined);
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
