import type { BannerSettings } from "@/lib/appSettings";

// text-{color} (not text-{color}-content) — the *-content tokens are meant
// for text on a solid bg-{color}, not on this faint /10 tint, and resolve to
// a near-white or near-black that disappears depending on the active theme.
const TYPE_CLASSES: Record<BannerSettings["type"], string> = {
  info: "bg-info/10 text-info border-info/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  success: "bg-success/10 text-success border-success/30",
};

export function SiteBanner({ banner }: { banner: BannerSettings | null }) {
  if (!banner || !banner.active || !banner.message.trim()) return null;

  return (
    <div className={`border-b px-4 py-2 text-center text-sm ${TYPE_CLASSES[banner.type]}`}>{banner.message}</div>
  );
}
