export type Point = { x: number; y: number };
export type FontFamily = "sans-serif" | "serif" | "monospace";

export type EditorElement =
  | {
      id: string;
      pageIndex: number;
      type: "text";
      xPt: number;
      yPt: number;
      widthPt: number;
      text: string;
      color: string;
      fontSizePt: number;
      fontFamily: FontFamily;
      isBold: boolean;
      isItalic: boolean;
    }
  | {
      id: string;
      pageIndex: number;
      type: "rect" | "highlight" | "ellipse";
      xPt: number;
      yPt: number;
      widthPt: number;
      heightPt: number;
      color: string;
    }
  | {
      id: string;
      pageIndex: number;
      type: "image";
      xPt: number;
      yPt: number;
      widthPt: number;
      heightPt: number;
      dataUrl: string;
      mimeType: "image/png" | "image/jpeg";
    }
  | {
      id: string;
      pageIndex: number;
      type: "path";
      points: Point[];
      color: string;
      strokeWidthPt: number;
    }
  | {
      id: string;
      pageIndex: number;
      type: "line";
      x1Pt: number;
      y1Pt: number;
      x2Pt: number;
      y2Pt: number;
      color: string;
      strokeWidthPt: number;
    }
  | {
      id: string;
      pageIndex: number;
      type: "link";
      xPt: number;
      yPt: number;
      widthPt: number;
      heightPt: number;
      url: string;
    }
  | {
      id: string;
      pageIndex: number;
      type: "whiteout";
      xPt: number;
      yPt: number;
      widthPt: number;
      heightPt: number;
    }
  | {
      id: string;
      pageIndex: number;
      type: "form-text";
      xPt: number;
      yPt: number;
      widthPt: number;
      heightPt: number;
      fieldName: string;
      defaultValue: string;
      multiline: boolean;
    }
  | {
      id: string;
      pageIndex: number;
      type: "form-checkbox";
      xPt: number;
      yPt: number;
      widthPt: number;
      heightPt: number;
      fieldName: string;
    }
  | {
      id: string;
      pageIndex: number;
      type: "form-dropdown";
      xPt: number;
      yPt: number;
      widthPt: number;
      heightPt: number;
      fieldName: string;
      /** Comma-separated for simple inline editing — split into options at save time. */
      optionsCsv: string;
    }
  | {
      id: string;
      pageIndex: number;
      type: "form-radio";
      xPt: number;
      yPt: number;
      widthPt: number;
      heightPt: number;
      /** Radio buttons sharing the same group name become one PDFRadioGroup at save
       *  time, each contributing one selectable option. */
      groupName: string;
      optionLabel: string;
    }
  | {
      id: string;
      pageIndex: number;
      type: "stamp";
      xPt: number;
      yPt: number;
      widthPt: number;
      heightPt: number;
      kind: "x" | "check" | "dot";
      color: string;
    }
  | {
      id: string;
      pageIndex: number;
      type: "text-edit";
      itemIndex: number;
      xPt: number;
      topPt: number;
      widthPt: number;
      /** The original detected text's width — a floor so the box can grow while
       *  typing a longer replacement but still shrink back down (not ratchet up
       *  permanently) once the text is short again. */
      originalWidthPt: number;
      heightPt: number;
      baselinePt: number;
      fontSizePt: number;
      text: string;
      color: string;
      /** Sampled from the rendered page behind the original text — used to mask it
       *  instead of always painting white, so edits blend into non-white backgrounds. */
      bgColorHex: string;
      /** Coarse family guess from pdf.js's TextContent styles — lets the replacement
       *  text use a closer-matching standard font instead of always Helvetica.
       *  User-editable afterwards via the floating text toolbar. */
      fontFamily: FontFamily;
      /** Guessed from comparing the PDF's actual rendered glyph width against a
       *  regular- vs. bold-weight canvas measurement (pdf.js doesn't expose the
       *  real font weight) — picks the Bold standard-font variant when true.
       *  User-editable afterwards via the floating text toolbar. */
      isBold: boolean;
      /** Italic can't be reliably guessed from glyph width the way bold can (slant
       *  doesn't change width) — always starts false, user-toggleable only. */
      isItalic: boolean;
    };

export type DetectedTextItem = {
  itemIndex: number;
  xPt: number;
  topPt: number;
  widthPt: number;
  heightPt: number;
  baselinePt: number;
  fontSizePt: number;
  str: string;
  bgColorHex: string;
  fontFamily: FontFamily;
  isBold: boolean;
};

export function createElementId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
