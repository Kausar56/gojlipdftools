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
      /** Clockwise degrees, as shown on screen — matches CSS's rotate()
       *  direction. pdf-lib's own rotation is counter-clockwise in PDF
       *  space, so the save step negates this before handing it off. */
      rotationDeg: number;
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
      type: "arrow";
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
      /** True for a field auto-detected from the uploaded PDF's own AcroForm
       *  (already has a widget placed on the page in the original file) — at
       *  save time this means updating that field's value in place rather
       *  than creating a new field and adding a second, duplicate widget. */
      isExisting: boolean;
      /** Black or white, picked once from the page's actual background color
       *  right under this field (not the app's own light/dark theme, which
       *  has nothing to do with what color the PDF page itself happens to
       *  be) — so typed text stays readable whether it's sitting on a plain
       *  white page or a dark/colored one. User-overridable from the
       *  toolbar's font color picker, same as form-dropdown's. */
      textColor: string;
      /** The field's own visible border, baked into the saved PDF's widget
       *  appearance (not just an editor-only outline) — same as form-dropdown's. */
      borderColor: string;
      fontSizePt: number;
      align: "left" | "center" | "right";
      required: boolean;
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
      /** Whether the box starts ticked when the PDF is opened. */
      checked: boolean;
      /** Checkmark color — adaptive by default (sampled from the page, same
       *  as form-text's textColor), user-overridable from the toolbar. */
      textColor: string;
      borderColor: string;
      required: boolean;
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
      /** One option per line — split into options at save time. */
      optionsText: string;
      /** Which option is pre-selected when the PDF is opened — empty means none. */
      selectedValue: string;
      /** Same per-field adaptive black/white pick as form-text's textColor —
       *  sampled once from the page's actual background under the field, but
       *  user-overridable from the toolbar's font color picker. */
      textColor: string;
      /** The field's own visible border, baked into the saved PDF's widget
       *  appearance (not just an editor-only outline). */
      borderColor: string;
      fontSizePt: number;
      /** Editor-preview only (CSS text-align) — pdf-lib has no alignment
       *  control for dropdown/choice fields, only text fields, so this can't
       *  be carried into the saved PDF's own appearance. */
      align: "left" | "center" | "right";
      multiSelect: boolean;
      required: boolean;
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
      /** True on at most one option per group — that option becomes the
       *  group's default selection when the PDF is opened. */
      selectedByDefault: boolean;
      textColor: string;
      borderColor: string;
      required: boolean;
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
      /** The text this element replaced. Kept so the background mask only grows
       *  beyond originalWidthPt by however much the *replacement* text is wider
       *  than the *original* — both measured in whatever font is being used at
       *  the time — instead of comparing the replacement against originalWidthPt
       *  directly, which mixes widths from two different fonts (the original's
       *  real, possibly-embedded font vs. the standard font used to redraw it)
       *  and made the mask overflow past the true original background region
       *  whenever the standard substitute simply rendered the same text wider. */
      originalText: string;
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
