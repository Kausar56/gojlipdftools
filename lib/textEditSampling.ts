function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.min(255, Math.max(0, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

function dominantColorHex(data: Uint8ClampedArray): string | null {
  const counts = new Map<string, number>();
  for (let i = 0; i < data.length; i += 4) {
    // Quantize so anti-aliased edge pixels collapse into the same bucket as the
    // solid fill they're blending toward, instead of each getting counted alone.
    const r = Math.round(data[i] / 16) * 16;
    const g = Math.round(data[i + 1] / 16) * 16;
    const b = Math.round(data[i + 2] / 16) * 16;
    const key = `${r},${g},${b}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  let bestKey: string | null = null;
  let bestCount = 0;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      bestKey = key;
    }
  }
  if (!bestKey) return null;
  const [r, g, b] = bestKey.split(",").map(Number);
  return rgbToHex(r, g, b);
}

/**
 * Samples the page background right around a detected text run, so masking it for
 * an edit can use the real surrounding color instead of assuming white. Prefers a
 * thin strip just above the text (usually clear of glyph ink); falls back to a strip
 * below, then the full box, then white if the canvas can't be read.
 */
export function sampleTextBackgroundColor(
  ctx: CanvasRenderingContext2D,
  boxXPx: number,
  boxYPx: number,
  boxWidthPx: number,
  boxHeightPx: number,
): string {
  const canvas = ctx.canvas;
  const x = Math.max(0, Math.round(boxXPx));
  const w = Math.max(1, Math.min(Math.round(boxWidthPx), canvas.width - x));
  if (w <= 0) return "#ffffff";

  const tryBand = (yPx: number, hPx: number): string | null => {
    const y = Math.round(yPx);
    const h = Math.max(1, Math.round(hPx));
    if (y < 0 || y + h > canvas.height) return null;
    try {
      const { data } = ctx.getImageData(x, y, w, h);
      return dominantColorHex(data);
    } catch {
      return null;
    }
  };

  return (
    tryBand(boxYPx - 3, 2) ??
    tryBand(boxYPx + boxHeightPx + 1, 2) ??
    tryBand(boxYPx, boxHeightPx) ??
    "#ffffff"
  );
}

/** Black or white, whichever reads better on top of the given background. */
export function getReadableTextColor(bgHex: string): string {
  const hex = bgHex.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5 ? "#ffffff" : "#000000";
}

export type FontFamilyGuess = "sans-serif" | "serif" | "monospace";

/** Maps pdf.js's coarse TextContent `fontFamily` hint to one of the 3 standard families. */
export function guessFontFamily(pdfJsFontFamily: string | undefined): FontFamilyGuess {
  const family = (pdfJsFontFamily ?? "").toLowerCase();
  if (family.includes("mono") || family.includes("courier") || family.includes("consolas")) {
    return "monospace";
  }
  if (family.includes("serif") && !family.includes("sans")) {
    return "serif";
  }
  return "sans-serif";
}

const CSS_FONT_FAMILY: Record<FontFamilyGuess, string> = {
  "sans-serif": "Helvetica, Arial, sans-serif",
  serif: "Georgia, 'Times New Roman', Times, serif",
  monospace: "'Courier New', Courier, monospace",
};

const PX_PER_PT = 96 / 72;

/**
 * pdf.js's public TextContent API doesn't expose font weight — only the coarse
 * family hint used by guessFontFamily. Bold glyphs are reliably wider than their
 * regular counterparts at the same size, so this compares the PDF's actual
 * rendered width for the string against a regular- and a bold-weight rendering
 * of the same string/family/size in a canvas, and picks whichever is closer.
 * Best-effort like the rest of this module — not a real font-flag check.
 */
export function guessIsBold(str: string, fontSizePt: number, actualWidthPt: number, family: FontFamilyGuess): boolean {
  if (typeof document === "undefined" || str.trim().length < 3) return false;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  const cssFamily = CSS_FONT_FAMILY[family];
  ctx.font = `${fontSizePt}pt ${cssFamily}`;
  const regularWidthPt = ctx.measureText(str).width / PX_PER_PT;
  ctx.font = `bold ${fontSizePt}pt ${cssFamily}`;
  const boldWidthPt = ctx.measureText(str).width / PX_PER_PT;

  if (boldWidthPt <= regularWidthPt) return false;
  const midpoint = (regularWidthPt + boldWidthPt) / 2;
  return actualWidthPt >= midpoint;
}

/**
 * Live width estimate (in PDF points) for text as it's being typed in the
 * editing box — used only to keep the box wide enough while editing, not for
 * the final saved PDF (handleSave measures with the real embedded font).
 */
export function measureTextWidthPt(str: string, fontSizePt: number, family: FontFamilyGuess, isBold: boolean): number {
  if (typeof document === "undefined" || !str) return 0;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;
  ctx.font = `${isBold ? "bold " : ""}${fontSizePt}pt ${CSS_FONT_FAMILY[family]}`;
  return ctx.measureText(str).width / PX_PER_PT;
}
