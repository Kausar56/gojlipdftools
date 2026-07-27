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
      type: "rect" | "ellipse";
      xPt: number;
      yPt: number;
      widthPt: number;
      heightPt: number;
      /** Border/stroke color. */
      color: string;
      strokeWidthPt: number;
      /** null = no fill (outline only), matching the original behavior. */
      fillColorHex: string | null;
    }
  | {
      id: string;
      pageIndex: number;
      type: "highlight";
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
      /** Read from the PDF's actual loaded Font object (pdfjs `commonObjs`), which
       *  reports real .bold/.italic flags from the font itself — not a guess.
       *  User-editable afterwards via the floating text toolbar. */
      isBold: boolean;
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
  /** The text's own sampled ink color, distinct from bgColorHex — null if no
   *  color clearly different from the background could be found in the box.
   *  Preferred over a computed black/white default so faded or colored
   *  original text keeps looking the same after being replaced. */
  inkColorHex: string | null;
  fontFamily: FontFamily;
  isBold: boolean;
  isItalic: boolean;
};

export function createElementId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
