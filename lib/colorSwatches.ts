export const colorSwatches = [
  { id: "primary", className: "bg-primary", hex: "#2663bb", darkHex: "#4f8fe0" },
  { id: "secondary", className: "bg-secondary", hex: "#10b981", darkHex: "#34d399" },
  { id: "accent", className: "bg-accent", hex: "#ef4444", darkHex: "#f87171" },
  { id: "neutral", className: "bg-neutral", hex: "#334155", darkHex: "#cbd5e1" },
] as const;

export type ColorSwatchId = (typeof colorSwatches)[number]["id"];

/**
 * A swatch's color as the CURRENT theme actually renders it, instead of always the
 * light-theme `hex` above. Use this wherever a swatch's color is actually applied
 * to something (drawing, watermark preview, saved PDF, etc.) — using the static
 * `hex` field there causes a real bug in dark mode: the swatch button visibly
 * shows the dark-theme color, but a different (light-theme) color gets applied,
 * so what you draw doesn't match what you picked.
 *
 * These pairs are copied straight from the `--color-*` values in app/globals.css
 * for each theme, matched by reading the `data-theme` attribute (always explicitly
 * "light" or "dark", set before hydration — see the inline script in layout.tsx).
 * Reading the CSS custom property's computed value directly isn't reliable here:
 * Tailwind's build canonicalizes some theme colors into lab()/oklch() notation and
 * leaves others as hex, so the string format isn't predictable across themes.
 */
export function resolveSwatchHex(id: ColorSwatchId): string {
  const swatch = colorSwatches.find((s) => s.id === id);
  if (!swatch) return "#000000";
  const isDark = typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "dark";
  return isDark ? swatch.darkHex : swatch.hex;
}

export function hexToRgbFloat(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  return [r, g, b];
}
