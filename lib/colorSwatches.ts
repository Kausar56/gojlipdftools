export const colorSwatches = [
  { id: "primary", className: "bg-primary", hex: "#2663bb" },
  { id: "secondary", className: "bg-secondary", hex: "#10b981" },
  { id: "accent", className: "bg-accent", hex: "#ef4444" },
  { id: "neutral", className: "bg-neutral", hex: "#334155" },
] as const;

export type ColorSwatchId = (typeof colorSwatches)[number]["id"];

export function hexToRgbFloat(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  return [r, g, b];
}
