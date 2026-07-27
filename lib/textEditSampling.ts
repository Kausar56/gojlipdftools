function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.min(255, Math.max(0, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

function dominantColorHex(data: Uint8ClampedArray): string | null {
  // Bucket key is quantized so anti-aliased edge pixels collapse into the same
  // group as the solid fill they're blending toward, instead of each getting
  // counted alone. But the bucket's rounded center was previously also used as
  // the *output* color — rounding each channel independently to a 16-step grid
  // (and, for values like 250, overshooting to 256 and getting clamped to 255)
  // measurably shifts light/pastel tints, e.g. a cream (250,247,240) background
  // could come back as a visibly pinkish (255,240,240). Barely visible against
  // near-white/black where the whole 16-step range still "reads" the same, but
  // very visible against any subtle colored background. Fixed by tracking the
  // real sum per bucket and averaging the *actual* pixels once the winning
  // bucket is chosen, so the output is the true local color, not a rounded grid point.
  const counts = new Map<string, { count: number; rSum: number; gSum: number; bSum: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = `${Math.round(r / 16)},${Math.round(g / 16)},${Math.round(b / 16)}`;
    const bucket = counts.get(key);
    if (bucket) {
      bucket.count += 1;
      bucket.rSum += r;
      bucket.gSum += g;
      bucket.bSum += b;
    } else {
      counts.set(key, { count: 1, rSum: r, gSum: g, bSum: b });
    }
  }

  let best: { count: number; rSum: number; gSum: number; bSum: number } | null = null;
  for (const bucket of counts.values()) {
    if (!best || bucket.count > best.count) best = bucket;
  }
  if (!best) return null;
  return rgbToHex(best.rSum / best.count, best.gSum / best.count, best.bSum / best.count);
}

/**
 * Samples the page background right around a detected text run, so masking it for
 * an edit can use the real surrounding color instead of assuming white.
 *
 * A thin strip immediately above/below the text is the obvious place to look, but
 * it silently breaks whenever the text sits on a colored highlight/badge that's
 * sized snugly to the text (very common — table cell fills, colored labels,
 * highlighted headings): that strip can land just outside the highlight's edge and
 * sample the page's own background instead, producing a mask that doesn't match
 * once drawn. That mismatch is invisible when the page background happens to be
 * white (both "wrong" and "right" samples read as white), which is why the bug
 * only shows up for colored backgrounds.
 *
 * Fixed by also sampling the four corners *inside* the text's own box — those are
 * normally free of glyph ink (padding before/after the first/last character) and,
 * unlike the strips, guaranteed to fall inside any highlight that wraps the text,
 * since a highlight can't cover text without covering the text's own bounding box.
 * All candidate regions are pooled into one combined vote so the true local color
 * wins regardless of which individual region it came from.
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

  const readBand = (xPx: number, yPx: number, wPx: number, hPx: number): Uint8ClampedArray | null => {
    const bx = Math.max(0, Math.round(xPx));
    const by = Math.max(0, Math.round(yPx));
    const bw = Math.max(1, Math.min(Math.round(wPx), canvas.width - bx));
    const bh = Math.max(1, Math.min(Math.round(hPx), canvas.height - by));
    if (bw <= 0 || bh <= 0 || by + bh > canvas.height) return null;
    try {
      return ctx.getImageData(bx, by, bw, bh).data;
    } catch {
      return null;
    }
  };

  const corner = Math.max(2, Math.min(4, Math.round(boxHeightPx / 3)));

  // Corners inside the box (top-left, top-right, bottom-left, bottom-right),
  // each a small square — safe from ink, guaranteed inside any wrapping highlight.
  const cornerBands = [
    readBand(boxXPx, boxYPx, corner, corner),
    readBand(boxXPx + boxWidthPx - corner, boxYPx, corner, corner),
    readBand(boxXPx, boxYPx + boxHeightPx - corner, corner, corner),
    readBand(boxXPx + boxWidthPx - corner, boxYPx + boxHeightPx - corner, corner, corner),
  ];
  const stripBands = [readBand(x, boxYPx - 3, w, 2), readBand(x, boxYPx + boxHeightPx + 1, w, 2)];

  const pooled: number[] = [];
  for (const band of [...cornerBands, ...stripBands]) {
    if (!band) continue;
    for (let i = 0; i < band.length; i++) pooled.push(band[i]);
  }
  if (pooled.length > 0) {
    const combined = dominantColorHex(Uint8ClampedArray.from(pooled));
    if (combined) return combined;
  }

  const wholeBox = readBand(x, boxYPx, w, boxHeightPx);
  if (wholeBox) {
    const fallback = dominantColorHex(wholeBox);
    if (fallback) return fallback;
  }

  return "#ffffff";
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

function hexToInts(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
}

/**
 * Samples the detected text's own rendered ink color (as opposed to the
 * background around it) — picks the color bucket within the box that's
 * farthest from the known background, which is normally the glyph fill.
 * This matters beyond just "what color is the text": a semi-transparent or
 * low-opacity original (a faded watermark-style heading, for example) renders
 * as some blended shade, not pure black — sampling that actual shade and
 * reusing it for the replacement (drawn at full opacity) reproduces the same
 * faded look, instead of defaulting to solid black/white and looking bolder
 * or more saturated than the original ever was.
 * Returns null if no color clearly distinct from the background is found
 * (e.g. box misses the glyphs entirely) — callers should fall back to
 * getReadableTextColor(bgHex) in that case.
 */
export function sampleTextInkColor(
  ctx: CanvasRenderingContext2D,
  boxXPx: number,
  boxYPx: number,
  boxWidthPx: number,
  boxHeightPx: number,
  bgHex: string,
): string | null {
  const canvas = ctx.canvas;
  const x = Math.max(0, Math.round(boxXPx));
  const y = Math.max(0, Math.round(boxYPx));
  const w = Math.max(1, Math.min(Math.round(boxWidthPx), canvas.width - x));
  const h = Math.max(1, Math.min(Math.round(boxHeightPx), canvas.height - y));
  if (w <= 0 || h <= 0) return null;

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(x, y, w, h).data;
  } catch {
    return null;
  }

  const [bgR, bgG, bgB] = hexToInts(bgHex);
  const totalPixels = w * h;
  // Bucketed the same way as dominantColorHex — quantized key for grouping, but
  // the real per-pixel sum is kept so the returned color is an average of the
  // actual pixels, not a rounded-to-16 grid point (see dominantColorHex for why
  // that distorts light/subtle tints).
  const counts = new Map<string, { count: number; rSum: number; gSum: number; bSum: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = `${Math.round(r / 16)},${Math.round(g / 16)},${Math.round(b / 16)}`;
    const bucket = counts.get(key);
    if (bucket) {
      bucket.count += 1;
      bucket.rSum += r;
      bucket.gSum += g;
      bucket.bSum += b;
    } else {
      counts.set(key, { count: 1, rSum: r, gSum: g, bSum: b });
    }
  }

  let best: { count: number; rSum: number; gSum: number; bSum: number } | null = null;
  let bestDist = -1;
  for (const bucket of counts.values()) {
    // Ignore near-noise buckets (a handful of stray anti-aliased pixels) —
    // real ink covers a meaningful fraction of the box.
    if (bucket.count < totalPixels * 0.03) continue;
    const r = bucket.rSum / bucket.count;
    const g = bucket.gSum / bucket.count;
    const b = bucket.bSum / bucket.count;
    const dist = (r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2;
    if (dist > bestDist) {
      bestDist = dist;
      best = bucket;
    }
  }
  // The 3%-coverage filter above already does the real noise-rejection work —
  // scattered anti-aliasing jitter spreads across many small buckets, none of
  // which clear that bar, while genuine ink (however faint) concentrates into
  // one coherent bucket that does. This distance check only needs to catch the
  // degenerate case where the box has no ink at all and the "best" bucket is
  // just the background itself (distance ~0). It used to also require ~30/channel
  // of separation to count as ink at all, which rejected genuinely faint/low-
  // opacity text (a light gray a few steps off white) as "not distinct enough"
  // and fell back to solid black — turning faded text dark after editing.
  if (!best || bestDist < 150) return null;
  return rgbToHex(best.rSum / best.count, best.gSum / best.count, best.bSum / best.count);
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

/**
 * pdf.js only computes a real, name-based .bold flag when a font is NOT
 * embedded (it's falling back to a system/standard substitute) — for a
 * genuinely embedded font (the common case for real-world PDFs from Word,
 * Google Docs, etc.), pdf.js never sets it, regardless of whether the glyphs
 * are visually bold. Bold glyphs are reliably wider than regular ones at the
 * same size for the same family, though, so comparing the PDF's actual
 * rendered width against a plain canvas measurement works as a fallback that
 * doesn't care whether the font is embedded.
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

