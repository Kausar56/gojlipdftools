"use client";

import { useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import type { BannerSettings } from "@/lib/appSettings";
import { ToolIcon } from "./icons";

// text-{color} (not text-{color}-content) — the *-content tokens are meant
// for text on a solid bg-{color}, not on this faint /10 tint, and resolve to
// a near-white or near-black that disappears depending on the active theme.
const TYPE_CLASSES: Record<BannerSettings["type"], string> = {
  info: "bg-info/10 text-info border-info/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  success: "bg-success/10 text-success border-success/30",
};

const SIZE_CLASSES: Record<BannerSettings["size"], string> = {
  sm: "py-1.5 text-xs",
  md: "py-2.5 text-sm",
  lg: "py-4 text-base",
};

const DISMISS_STORAGE_KEY = "gojli-banner-dismissed";

function isPathAllowed(pathname: string, pages: BannerSettings["pages"]): boolean {
  return pages === "all" || pages.includes(pathname);
}

function isWithinSchedule(banner: BannerSettings): boolean {
  const now = Date.now();
  if (banner.startAt && now < new Date(banner.startAt).getTime()) return false;
  if (banner.endAt && now > new Date(banner.endAt).getTime()) return false;
  return true;
}

function readStoredDismiss(bannerId: string): boolean {
  try {
    const saved = JSON.parse(localStorage.getItem(DISMISS_STORAGE_KEY) ?? "null") as { id: string; until: number } | null;
    return Boolean(saved && saved.id === bannerId && Date.now() < saved.until);
  } catch {
    return false;
  }
}

// No subscribe target — localStorage's own 'dismissed' entry never changes
// out from under this tab except through handleClose below, which updates
// closedThisSession directly (a normal event-handler state update, not a
// setState-in-effect). useSyncExternalStore is only doing SSR-safe reading
// here: the server snapshot is always false (no localStorage during SSR),
// and the client re-reads once on mount without needing an effect.
const noopSubscribe = () => () => {};

export function SiteBanner({ banner }: { banner: BannerSettings | null }) {
  const pathname = usePathname();
  const [closedThisSession, setClosedThisSession] = useState(false);
  const storedDismissed = useSyncExternalStore(
    noopSubscribe,
    () => (banner ? readStoredDismiss(banner.id) : false),
    () => false,
  );
  const dismissed = closedThisSession || storedDismissed;

  // The admin panel never shows a site banner, regardless of the "show on"
  // setting — a moderator/admin working in /admin shouldn't see a marketing
  // or maintenance notice meant for visitors.
  if (!banner || !banner.active || !banner.message.trim()) return null;
  if (pathname?.startsWith("/admin")) return null;
  if (!isPathAllowed(pathname ?? "/", banner.pages)) return null;
  if (!isWithinSchedule(banner)) return null;
  if (dismissed) return null;

  function handleClose() {
    setClosedThisSession(true);
    // dismissDurationDays null/0 means "until refresh only" — leaving
    // localStorage untouched is exactly that: nothing persists, so the next
    // page load (a real refresh, not a client-side navigation) shows it
    // again.
    if (banner!.dismissDurationDays) {
      try {
        localStorage.setItem(
          DISMISS_STORAGE_KEY,
          JSON.stringify({ id: banner!.id, until: Date.now() + banner!.dismissDurationDays * 24 * 60 * 60 * 1000 }),
        );
      } catch {
        // Storage blocked (private mode, quota) — the in-memory dismissal
        // above still holds for the rest of this page load.
      }
    }
  }

  const isExternalCta = banner.ctaUrl?.startsWith("http");

  return (
    <div className={`relative border-b px-10 text-center ${TYPE_CLASSES[banner.type]} ${SIZE_CLASSES[banner.size]}`}>
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <p className="min-w-0 wrap-break-word">{banner.message}</p>
        {banner.ctaLabel &&
          banner.ctaUrl &&
          (isExternalCta ? (
            <a
              href={banner.ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 font-semibold underline underline-offset-2 hover:no-underline"
            >
              {banner.ctaLabel}
            </a>
          ) : (
            <Link href={banner.ctaUrl} className="shrink-0 font-semibold underline underline-offset-2 hover:no-underline">
              {banner.ctaLabel}
            </Link>
          ))}
      </div>

      {banner.dismissible && (
        <button
          type="button"
          onClick={handleClose}
          aria-label="Dismiss announcement"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 opacity-60 transition hover:bg-current/10 hover:opacity-100 sm:right-4"
        >
          <ToolIcon name="close" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
