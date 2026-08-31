"use client";

import { useEffect, useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { TextEditToolbar } from "./TextEditToolbar";
import { ShapeEditToolbar } from "./ShapeEditToolbar";
import { LineEditToolbar } from "./LineEditToolbar";
import { DropdownEditToolbar } from "./DropdownEditToolbar";
import { FormTextEditToolbar } from "./FormTextEditToolbar";
import { SignatureMenu } from "./SignatureMenu";
import { ImageEditToolbar } from "./ImageEditToolbar";
import { CheckboxEditToolbar } from "./CheckboxEditToolbar";
import { RadioEditToolbar } from "./RadioEditToolbar";
import { SignaturePad } from "./SignaturePad";
import { SaveSuccessModal } from "./SaveSuccessModal";
import { FindReplacePanel } from "./FindReplacePanel";
import { ToolbarDropdown } from "./ToolbarDropdown";
import { NativeColorInput } from "./NativeColorInput";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { colorSwatches, hexToRgbFloat, resolveSwatchHex } from "@/lib/colorSwatches";
import { loadPdfjs } from "@/lib/pdfjs";
import { createElementId, type DetectedTextItem, type EditorElement, type Point } from "@/lib/editorElements";
import { describeError } from "@/lib/errorHelpers";
import {
  sampleTextBackgroundColor,
  sampleTextInkColor,
  getReadableTextColor,
  guessFontFamily,
  guessIsBold,
  measureTextWidthPt,
  type FontFamilyGuess,
} from "@/lib/textEditSampling";

type ToolId =
  | "cursor"
  | "text"
  | "link"
  | "stamp-x"
  | "stamp-check"
  | "stamp-dot"
  | "form-text"
  | "form-multiline"
  | "form-dropdown"
  | "form-radio"
  | "form-checkbox"
  | "image"
  | "signature"
  | "whiteout"
  | "draw"
  | "highlight"
  | "shapes"
  | "erase";
type ShapeType = "rectangle" | "circle" | "line" | "arrow";

type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

// 8 invisible drag strips around a box's own border — each keeps the
// *opposite* edge anchored while dragging (see startElementResize), so
// resizing from any corner or edge feels natural instead of the box always
// re-anchoring at its top-left. These used to be filled squares sitting well
// outside the corners; at small font sizes the squares were bigger than the
// text itself and the mid-edge ones sat right on top of the glyphs. Now
// there's nothing to see — just a thin strip *on* the selection outline
// (see the "selected" outline below) with the right cursor, running along
// almost the whole edge rather than one small point in the middle.
const RESIZE_HANDLES: { dir: ResizeHandle; className: string; cursor: string }[] = [
  { dir: "nw", className: "-top-1 -left-1 h-3 w-3", cursor: "cursor-nwse-resize" },
  { dir: "n", className: "-top-1 left-3 right-3 h-2", cursor: "cursor-ns-resize" },
  { dir: "ne", className: "-top-1 -right-1 h-3 w-3", cursor: "cursor-nesw-resize" },
  { dir: "e", className: "top-3 bottom-3 -right-1 w-2", cursor: "cursor-ew-resize" },
  { dir: "se", className: "-bottom-1 -right-1 h-3 w-3", cursor: "cursor-nwse-resize" },
  { dir: "s", className: "-bottom-1 left-3 right-3 h-2", cursor: "cursor-ns-resize" },
  { dir: "sw", className: "-bottom-1 -left-1 h-3 w-3", cursor: "cursor-nesw-resize" },
  { dir: "w", className: "top-3 bottom-3 -left-1 w-2", cursor: "cursor-ew-resize" },
];

const shapeTypes: { id: ShapeType; icon: string; label: string }[] = [
  { id: "rectangle", icon: "shape-rect", label: "Rectangle" },
  { id: "circle", icon: "shape-circle", label: "Circle" },
  { id: "line", icon: "shape-line", label: "Line" },
  { id: "arrow", icon: "shape-arrow", label: "Arrow" },
];

// Two open "wing" segments pulled back from the tip (x2,y2), at a fixed
// spread angle from the shaft direction — an open "V" arrowhead rather than a
// filled triangle, since pdf-lib has no simple filled-polygon primitive and
// this way the on-screen preview and the saved PDF use the exact same shape.
function arrowHeadWings(x1: number, y1: number, x2: number, y2: number, length: number): [[number, number], [number, number]] {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const spread = Math.PI / 7;
  return [
    [x2 - length * Math.cos(angle - spread), y2 - length * Math.sin(angle - spread)],
    [x2 - length * Math.cos(angle + spread), y2 - length * Math.sin(angle + spread)],
  ];
}

const annotateTypes: { id: "draw" | "highlight"; icon: string; label: string }[] = [
  { id: "draw", icon: "pen", label: "Pen" },
  { id: "highlight", icon: "highlighter", label: "Highlighter" },
];

const stampTypes: { id: "stamp-x" | "stamp-check" | "stamp-dot"; icon: string; label: string }[] = [
  { id: "stamp-x", icon: "close", label: "Cross" },
  { id: "stamp-check", icon: "check", label: "Checkmark" },
  { id: "stamp-dot", icon: "dot", label: "Dot" },
];

const formFieldTypes: { id: "form-text" | "form-multiline" | "form-dropdown" | "form-radio" | "form-checkbox"; icon: string; label: string }[] = [
  { id: "form-text", icon: "form-field", label: "Text" },
  { id: "form-multiline", icon: "text-multiline", label: "Text multiline" },
  { id: "form-dropdown", icon: "dropdown-list", label: "Drop-down list" },
  { id: "form-radio", icon: "radio-button", label: "Radio button" },
  { id: "form-checkbox", icon: "checkbox", label: "Checkbox" },
];

// "shapes" is intentionally excluded — border/fill color is now set per-shape
// via the floating ShapeEditToolbar right after it's placed (shapes auto-select
// on creation), so a default-color picker in the persistent toolbar duplicated
// that and was one extra, unnecessary step. "draw" is excluded for the same
// reason — pen color/thickness now live in their own popover (see the
// "Annotate" dropdown), not a plain always-visible swatch row.
// "text" is deliberately excluded — its own floating TextEditToolbar (shown
// once a box is placed/selected) already has a color picker, so this bar
// showing one too was a duplicate the user has to dismiss twice.
const toolsWithColor = new Set<ToolId>(["highlight", "stamp-x", "stamp-check", "stamp-dot"]);
const DEFAULT_TEXT_FONT_SIZE_PT = 16;
const CLICK_TO_ADD: ToolId[] = [
  "text",
  "shapes",
  "highlight",
  "link",
  "stamp-x",
  "stamp-check",
  "stamp-dot",
  "form-text",
  "form-multiline",
  "form-dropdown",
  "form-radio",
  "form-checkbox",
];
const ASCENT_RATIO = 0.8;
const CONTAINER_PADDING_PX = 48;
// Fixed render scale used only for detecting text on pages the viewer isn't
// currently showing (Find & Replace scans every page) — independent of
// whatever zoom the visible page happens to be at, and irrelevant to the
// output since DetectedTextItem coordinates are stored in PDF points, not
// pixels; this just needs to be high enough for reliable color sampling.
const OFFSCREEN_RENDER_SCALE = 2;

/**
 * Extracted from the main per-page render effect so Find & Replace can reuse
 * the exact same detection (position, background/ink color, font family,
 * bold/italic) for pages other than the one currently on screen.
 */
async function detectTextItems(
  page: import("pdfjs-dist").PDFPageProxy,
  ctx: CanvasRenderingContext2D,
  pageHeightPt: number,
  renderScale: number,
): Promise<DetectedTextItem[]> {
  const content = await page.getTextContent();
  const detected: DetectedTextItem[] = [];
  // One readback for the whole page instead of one per text item — each
  // ctx.getImageData() call forces a GPU-to-CPU pixel readback, and the two
  // sampling functions below used to call it up to ~8 times *per item* (a
  // few small band reads each). A text-heavy page with a few hundred items
  // turned into a few thousand of these, which is what actually made
  // importing a PDF feel slow — the page was already rendered and just
  // waiting on this loop. Sampling now reads out of one cached pixel buffer.
  const canvas = ctx.canvas;
  const { data: pixels } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  content.items.forEach((item, itemIndex) => {
    if (!("str" in item) || !item.str.trim()) return;
    const t = item.transform;
    const isAxisAligned = Math.abs(t[1]) < 0.01 && Math.abs(t[2]) < 0.01;
    if (!isAxisAligned) return;

    const fontSizePt = Math.abs(t[3]);
    const baselinePt = t[5];
    const xPt = t[4];
    const widthPt = item.width;
    const heightPt = item.height || fontSizePt;
    const topPt = pageHeightPt - (baselinePt + fontSizePt * ASCENT_RATIO);

    const bgColorHex = sampleTextBackgroundColor(
      pixels,
      canvas.width,
      canvas.height,
      xPt * renderScale,
      topPt * renderScale,
      widthPt * renderScale,
      heightPt * renderScale,
    );
    const inkColorHex = sampleTextInkColor(
      pixels,
      canvas.width,
      canvas.height,
      xPt * renderScale,
      topPt * renderScale,
      widthPt * renderScale,
      heightPt * renderScale,
      bgColorHex,
    );
    const fontFamily = "fontName" in item ? content.styles[item.fontName]?.fontFamily : undefined;
    const familyGuess = guessFontFamily(fontFamily);

    let fontObjBold = false;
    let fontObjItalic = false;
    let nameBold = false;
    let nameItalic = false;
    if ("fontName" in item) {
      try {
        const fontObj = page.commonObjs.get(item.fontName) as { bold?: boolean; italic?: boolean; name?: string };
        fontObjBold = Boolean(fontObj?.bold);
        fontObjItalic = Boolean(fontObj?.italic);
        if (fontObj?.name) {
          nameBold = /bold/i.test(fontObj.name);
          nameItalic = /italic|oblique/i.test(fontObj.name);
        }
      } catch {
        // Font not resolved yet.
      }
    }
    const isBold = fontObjBold || nameBold || guessIsBold(item.str, fontSizePt, widthPt, familyGuess);
    const isItalic = fontObjItalic || nameItalic;

    detected.push({
      itemIndex,
      xPt,
      topPt,
      widthPt,
      heightPt,
      baselinePt,
      fontSizePt,
      str: item.str,
      bgColorHex,
      inkColorHex,
      fontFamily: familyGuess,
      isBold,
      isItalic,
    });
  });
  return detected;
}

/** Renders a page off-screen (never touches the visible canvas) purely to run
 *  detectTextItems on it — used by Find & Replace to scan pages other than
 *  the one currently displayed. */
async function renderAndDetectPage(
  pdfDoc: import("pdfjs-dist").PDFDocumentProxy,
  pageIndex: number,
): Promise<DetectedTextItem[]> {
  const page = await pdfDoc.getPage(pageIndex + 1);
  const baseViewport = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: OFFSCREEN_RENDER_SCALE });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];
  // annotationMode: 0 (disabled) — pdf.js's default rendering bakes form
  // field widgets' *current appearance* (their existing value, border, etc.)
  // onto the canvas as flat pixels. Every field this app cares about is
  // handled entirely by its own React overlay instead, so leaving that on
  // just means the original value's pixels sit permanently underneath
  // whatever the overlay shows, with no way for editing it to "remove" them.
  const renderTask = page.render({ canvas, canvasContext: ctx, viewport, annotationMode: 0 });
  await renderTask.promise;
  return detectTextItems(page, ctx, baseViewport.height, OFFSCREEN_RENDER_SCALE);
}

/** Reads a File's bytes for pdf-lib, with a clear error instead of pdf-lib's
 *  own confusing one if this ever comes back unusable. pdf-lib reports any
 *  value passed to PDFDocument.load() that isn't a string/Uint8Array/
 *  ArrayBuffer as `` `pdf` must be of type ... but was actually of type `NaN` ``
 *  regardless of what the value actually was — its own type-detection helper
 *  calls the global isNaN(), which coerces nearly any non-primitive value to
 *  NaN, so the real value (a File, an empty object, whatever) never shows up
 *  in the message. Guarding here at least surfaces something actionable if
 *  file.arrayBuffer() (which should always resolve to a real ArrayBuffer for
 *  a genuine File) ever doesn't. */
async function readPdfBytes(file: File): Promise<ArrayBuffer> {
  const bytes = await file.arrayBuffer();
  if (!(bytes instanceof ArrayBuffer) || bytes.byteLength === 0) {
    throw new Error("Couldn't read this file — try re-selecting it and saving again.");
  }
  return bytes;
}

/** Scans every page's AcroForm widget annotations for text fields already
 *  present in the uploaded PDF (built in Acrobat, Google Forms exports, form
 *  templates, etc.) and turns each into an editable form-text overlay —
 *  Sejda-style "open a fillable PDF and just click into it to type," instead
 *  of requiring the user to redraw every field by hand with the Forms tool
 *  first. Scoped to text fields only for now (the overwhelming majority of
 *  real-world forms); checkboxes/dropdowns/radios in an uploaded PDF still
 *  render as plain (uneditable) page content, same as before. */
async function detectExistingFormFields(pdfDoc: import("pdfjs-dist").PDFDocumentProxy): Promise<EditorElement[]> {
  const detected: EditorElement[] = [];
  for (let pageIndex = 0; pageIndex < pdfDoc.numPages; pageIndex++) {
    const page = await pdfDoc.getPage(pageIndex + 1);
    const baseViewport = page.getViewport({ scale: 1 });
    const annotations = (await page.getAnnotations({ intent: "display" })) as Array<{
      subtype?: string;
      fieldType?: string;
      fieldName?: string;
      fieldValue?: unknown;
      multiLine?: boolean;
      rect?: [number, number, number, number];
      hidden?: boolean;
      required?: boolean;
      borderColor?: Record<number, number>;
      defaultAppearanceData?: { fontSize?: number };
    }>;

    const textFieldAnnots = annotations.filter(
      (a) => a.subtype === "Widget" && a.fieldType === "Tx" && !a.hidden && a.fieldName && a.rect,
    );
    if (textFieldAnnots.length === 0) continue;

    // One off-screen render + one pixel readback per page (not per field —
    // same reasoning as the text-color sampling above) so each field's text
    // color can be picked to actually read against whatever's really behind
    // it, instead of assuming every page is plain white.
    let pixels: Uint8ClampedArray | null = null;
    let pixelsWidth = 0;
    let pixelsHeight = 0;
    try {
      const offscreenViewport = page.getViewport({ scale: OFFSCREEN_RENDER_SCALE });
      const offscreenCanvas = document.createElement("canvas");
      offscreenCanvas.width = offscreenViewport.width;
      offscreenCanvas.height = offscreenViewport.height;
      const offscreenCtx = offscreenCanvas.getContext("2d");
      if (offscreenCtx) {
        // annotationMode: 0 — sampling the *true* page background behind a
        // field, not the field's own already-baked-in value/appearance.
        await page.render({ canvas: offscreenCanvas, canvasContext: offscreenCtx, viewport: offscreenViewport, annotationMode: 0 })
          .promise;
        pixels = offscreenCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height).data;
        pixelsWidth = offscreenCanvas.width;
        pixelsHeight = offscreenCanvas.height;
      }
    } catch {
      // Sampling is best-effort — fields still get detected, just default to black text.
    }

    for (const annot of textFieldAnnots) {
      const [x1, y1, x2, y2] = annot.rect!;
      const widthPt = Math.abs(x2 - x1);
      const heightPt = Math.abs(y2 - y1);
      if (widthPt < 4 || heightPt < 4) continue;
      // convertToViewportPoint (not manual pageHeight - y math) so a rotated
      // page or a non-zero MediaBox origin still lands in the right spot —
      // it's the same top-down, unscaled point space every other xPt/yPt in
      // this file already uses.
      const [xPt, topYPt] = baseViewport.convertToViewportPoint(Math.min(x1, x2), Math.max(y1, y2));

      let textColor = "#000000";
      if (pixels) {
        const bgHex = sampleTextBackgroundColor(
          pixels,
          pixelsWidth,
          pixelsHeight,
          xPt * OFFSCREEN_RENDER_SCALE,
          topYPt * OFFSCREEN_RENDER_SCALE,
          widthPt * OFFSCREEN_RENDER_SCALE,
          heightPt * OFFSCREEN_RENDER_SCALE,
        );
        textColor = getReadableTextColor(bgHex);
      }

      // Prefer the field's own real border color/font size from the PDF
      // itself over a generic default, when pdf.js was able to read them.
      const borderColor = annot.borderColor
        ? `#${[0, 1, 2].map((i) => Math.round(annot.borderColor![i] ?? 0).toString(16).padStart(2, "0")).join("")}`
        : "#000000";
      const fontSizePt = annot.defaultAppearanceData?.fontSize && annot.defaultAppearanceData.fontSize > 0
        ? annot.defaultAppearanceData.fontSize
        : 11;

      detected.push({
        id: createElementId(),
        pageIndex,
        type: "form-text",
        xPt,
        yPt: topYPt,
        widthPt,
        heightPt,
        fieldName: annot.fieldName!,
        defaultValue: typeof annot.fieldValue === "string" ? annot.fieldValue : "",
        multiline: Boolean(annot.multiLine),
        isExisting: true,
        textColor,
        borderColor,
        fontSizePt,
        align: "left",
        required: Boolean(annot.required),
      });
    }
  }
  return detected;
}

export function PdfEditorWorkspace() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const fileInfoBarRef = useRef<HTMLDivElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<import("pdfjs-dist").PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSizePt, setPageSizePt] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [isRendering, setIsRendering] = useState(false);
  const [textItems, setTextItems] = useState<DetectedTextItem[]>([]);

  const [showFindReplace, setShowFindReplace] = useState(false);
  const [isIndexingSearch, setIsIndexingSearch] = useState(false);
  // One entry per page, each holding that page's detected text items — null
  // pages haven't been scanned yet. Rebuilt fresh whenever the panel opens, so
  // it can't go stale against edits made since it was last built.
  const [searchIndexByPage, setSearchIndexByPage] = useState<DetectedTextItem[][]>([]);
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  // itemIndex+pageIndex pairs that have already been replaced this session —
  // filtered out of the live match list without needing to re-scan.
  const [replacedKeys, setReplacedKeys] = useState<Set<string>>(new Set());

  const [activeTool, setActiveTool] = useState<ToolId>("cursor");
  // Black, not the brand primary swatch — stamps/ink/shape marks read as a
  // normal pen/stamp color by default, matching what most PDF tools (and real
  // ink stamps) default to; still fully overridable via the toolbar's color
  // swatches for whichever tool is active.
  const [activeColorHex, setActiveColorHex] = useState<string>("#000000");
  const [activePenStrokeWidthPt, setActivePenStrokeWidthPt] = useState(2);
  // The pen color/thickness submenu normally opens on :hover, which never
  // fires on touch — this lets a tap on its toggle open it too.
  const [penSubmenuOpen, setPenSubmenuOpen] = useState(false);
  const [shapeType, setShapeType] = useState<ShapeType>("rectangle");
  const [elements, setElements] = useState<EditorElement[]>([]);
  const [drawingPath, setDrawingPath] = useState<Point[] | null>(null);
  const [lineDraft, setLineDraft] = useState<{ start: Point; current: Point } | null>(null);
  const [whiteoutDraft, setWhiteoutDraft] = useState<{ start: Point; current: Point } | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  // Cached so re-clicking "Sign" later can offer to reuse it instead of
  // always reopening a blank drawing pad — see SignatureMenu.
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [past, setPast] = useState<EditorElement[][]>([]);
  const [future, setFuture] = useState<EditorElement[][]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 900, height: 700 });
  const [pageOpBusy, setPageOpBusy] = useState(false);
  const [toolbarPinned, setToolbarPinned] = useState(false);
  const [toolbarBounds, setToolbarBounds] = useState<{ left: number; width: number } | null>(null);
  const [toolbarHeight, setToolbarHeight] = useState(0);

  // Any change to the elements — typing into a form field, moving/resizing
  // something, adding or deleting an annotation — invalidates whatever was
  // last saved. Without this, a successful save replaces the "Save PDF"
  // button with a "Download" link bound to that specific blob; if the user
  // keeps editing afterward (as the flow naturally encourages — nothing else
  // prompts a re-save) and then clicks that same Download link, they silently
  // get the older snapshot with none of the edits made after the last save.
  useEffect(() => {
    if (status !== "done") return;
    setDownloadUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setStatus("idle");
    setShowSuccessModal(false);
    // Intentionally only watches `elements` — viewport/zoom/page-navigation
    // state doesn't affect what would be saved, so it shouldn't force a re-save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      // Round to avoid re-triggering the page-render effect (which re-runs text
      // detection) on sub-pixel ResizeObserver noise.
      setContainerSize({
        width: Math.round(entry.contentRect.width / 8) * 8,
        height: Math.round(entry.contentRect.height / 8) * 8,
      });
    });
    observer.observe(container);
    return () => observer.disconnect();
    // scrollContainerRef only mounts once a file is loaded (the upload dropzone
    // renders in its place before that) — re-run once `file` flips so the
    // observer actually attaches to the real element instead of finding null.
  }, [file]);

  useEffect(() => {
    const workspaceEl = workspaceRef.current;
    const toolbarEl = toolbarRef.current;
    const fileInfoBarEl = fileInfoBarRef.current;
    if (!workspaceEl || !toolbarEl || !fileInfoBarEl) return;

    // The site header on this page isn't sticky (see Navbar), so this toolbar
    // (tool buttons + page controls — NOT the filename/save bar above it, which
    // stays in normal flow to avoid wasting space while pinned) takes over that
    // role instead. It can't use CSS `position: sticky` — the tool-page layout's
    // decorative curve sections use `overflow-hidden`, and per spec ANY ancestor
    // with non-visible overflow becomes the sticky containing block, which would
    // confine (and effectively disable) sticky positioning to that non-scrolling
    // box instead of the real page scroll. `position: fixed` isn't subject to
    // that, so it's reproduced by hand here: pin once the filename bar has fully
    // scrolled past the viewport top, with a same-height spacer standing in for
    // the toolbar so content doesn't jump.
    function measure() {
      const rect = workspaceEl!.getBoundingClientRect();
      setToolbarBounds({ left: rect.left, width: rect.width });
      setToolbarHeight(toolbarEl!.getBoundingClientRect().height);
    }
    function onScroll() {
      setToolbarPinned(fileInfoBarEl!.getBoundingClientRect().bottom <= 0);
    }

    measure();
    onScroll();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(workspaceEl);
    resizeObserver.observe(toolbarEl);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
    };
  }, [file]);

  useEffect(() => {
    if (!pdfDoc) return;
    let cancelled = false;

    (async () => {
      setIsRendering(true);
      const page = await pdfDoc.getPage(currentPage + 1);
      const baseViewport = page.getViewport({ scale: 1 });
      // Fit the page to the full available width at 100% zoom, like a normal PDF
      // viewer — NOT also capped by height. Capping by height too meant a short
      // browser window shrank the page tiny even with plenty of width to spare;
      // width-fit instead makes full use of the wide workspace, and a page taller
      // than the visible area just scrolls (the toolbar rows stay fixed above the
      // scroll container, so they're always visible regardless).
      const availableWidth = Math.max(200, containerSize.width - CONTAINER_PADDING_PX);
      const fitScale = availableWidth / baseViewport.width;
      const renderScale = fitScale * (zoomPercent / 100);
      const viewport = page.getViewport({ scale: renderScale });

      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Rapid re-renders (zoom, page switch, or container resize firing in quick
      // succession) can otherwise overlap two render tasks on the same canvas —
      // pdf.js doesn't guard against that itself, and the result is corrupted,
      // half-drawn pixels. Cancel whatever's in flight before starting a new one.
      renderTaskRef.current?.cancel();
      // annotationMode: 0 — see detectExistingFormFields for why: without
      // this, an existing form field's current value gets baked into these
      // very pixels by pdf.js itself, sitting permanently underneath the
      // editable overlay this app draws for that same field.
      const renderTask = page.render({ canvas, canvasContext: ctx, viewport, annotationMode: 0 });
      renderTaskRef.current = renderTask;
      try {
        await renderTask.promise;
      } catch (error) {
        if (error instanceof Error && error.name === "RenderingCancelledException") return;
        throw error;
      }
      if (cancelled) return;

      const pageHeightPt = baseViewport.height;
      const detected = await detectTextItems(page, ctx, pageHeightPt, renderScale);
      if (cancelled) return;

      setTextItems(detected);
      setScale(renderScale);
      setPageSizePt({ width: baseViewport.width, height: pageHeightPt });
      setIsRendering(false);
    })();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [pdfDoc, currentPage, zoomPercent, containerSize]);

  async function loadFile(selected: File) {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setStatus("idle");
    setShowSuccessModal(false);
    setErrorMessage("");
    setElements([]);
    setPast([]);
    setFuture([]);
    setActiveTool("cursor");
    setFile(selected);

    const pdfjs = await loadPdfjs();
    const bytes = await selected.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: bytes }).promise;
    setPdfDoc(doc);
    setPageCount(doc.numPages);
    setCurrentPage(0);

    // Best-effort — a PDF with a malformed AcroForm shouldn't block opening
    // it for editing, it just won't get auto-filled fields.
    try {
      const detectedFields = await detectExistingFormFields(doc);
      if (detectedFields.length > 0) setElements(detectedFields);
    } catch {
      // Ignore — the page still opens fine without pre-detected fields.
    }
  }

  function toPagePoint(event: { clientX: number; clientY: number }): Point {
    const rect = overlayRef.current!.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / scale,
      y: (event.clientY - rect.top) / scale,
    };
  }

  /** Center of whatever part of the page is actually visible in the browser
   *  window right now — not the page's own full-height center. This app's
   *  page view has no inner scroll container of its own (see the comment on
   *  scrollContainerRef below); the whole document scrolls, so on a page
   *  taller than the window, the page's true vertical center is very often
   *  well outside the current scroll position. Signatures placed there
   *  looked like they'd silently failed to add anything. */
  function visibleCenterPagePoint(): Point {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return { x: pageSizePt.width / 2, y: pageSizePt.height / 2 };
    const visibleTop = Math.max(rect.top, 0);
    const visibleBottom = Math.min(rect.bottom, window.innerHeight);
    const centerScreenY = visibleBottom > visibleTop ? (visibleTop + visibleBottom) / 2 : rect.top + rect.height / 2;
    return {
      x: pageSizePt.width / 2,
      y: (centerScreenY - rect.top) / scale,
    };
  }

  /** Black or white, whichever reads on the page's actual pixels under a
   *  newly-placed form field — samples the currently-rendered on-screen
   *  canvas at the click point rather than assuming every page is plain
   *  white (a colored template, a dark scanned page, etc. would otherwise
   *  swallow the text). */
  function readableFormTextColorAt(xPt: number, yPt: number, widthPt: number, heightPt: number): string {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return "#000000";
    try {
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const bgHex = sampleTextBackgroundColor(data, canvas.width, canvas.height, xPt * scale, yPt * scale, widthPt * scale, heightPt * scale);
      return getReadableTextColor(bgHex);
    } catch {
      return "#000000";
    }
  }

  function pushHistory() {
    setPast((prev) => [...prev, elements]);
    setFuture([]);
  }

  function undo() {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast(past.slice(0, -1));
    setFuture((f) => [elements, ...f]);
    setElements(previous);
  }

  function redo() {
    if (future.length === 0) return;
    const next = future[0];
    setFuture(future.slice(1));
    setPast((p) => [...p, elements]);
    setElements(next);
  }

  function addElement(element: EditorElement) {
    pushHistory();
    setElements((prev) => [...prev, element]);
  }

  function updateElement(id: string, patch: Partial<EditorElement>) {
    setElements((prev) =>
      prev.map((el) => {
        if (el.id !== id) return el;
        // Growing the font size (e.g. via the floating toolbar's +/- stepper)
        // without also growing the box left the old fixed width/height too
        // small for the now-larger glyphs — the textarea's overflow-x-hidden
        // clipped the tail of the text, and its default overflow-y showed a
        // scrollbar once the taller line no longer fit the unchanged height.
        // Re-measuring here keeps the box sized to whatever the text actually
        // needs at its current font size.
        if (
          (el.type === "text" || el.type === "text-edit") &&
          "fontSizePt" in patch &&
          typeof patch.fontSizePt === "number" &&
          patch.fontSizePt !== el.fontSizePt &&
          el.fontSizePt > 0
        ) {
          const newFontSizePt = patch.fontSizePt;
          const isBold = "isBold" in patch && typeof patch.isBold === "boolean" ? patch.isBold : el.isBold;
          const family = el.fontFamily as FontFamilyGuess;
          if (el.type === "text-edit") {
            // Always a single line — no newlines possible in this type.
            const measuredWidthPt = measureTextWidthPt(el.text, newFontSizePt, family, isBold);
            const ratio = newFontSizePt / el.fontSizePt;
            return { ...el, ...patch, widthPt: Math.max(20, measuredWidthPt), heightPt: el.heightPt * ratio } as EditorElement;
          }
          // "text" can have real newlines now (wrap is off; Enter is the only
          // way to get a new line) — measuring el.text as one string would run
          // measureText() over the raw "\n" characters instead of treating them
          // as line breaks, undercounting the box's real required width.
          const widestLinePt = el.text
            .split("\n")
            .reduce((max, line) => Math.max(max, measureTextWidthPt(line, newFontSizePt, family, isBold)), 0);
          return { ...el, ...patch, widthPt: Math.max(20, widestLinePt + 8) } as EditorElement;
        }
        return { ...el, ...patch } as EditorElement;
      }),
    );
  }

  function removeElement(id: string) {
    pushHistory();
    setElements((prev) => prev.filter((el) => el.id !== id));
    setSelectedElementId((current) => (current === id ? null : current));
  }

  /** Picking one radio option clears "selected" on every other option that
   *  shares its group name — a real radio group only ever has one selection,
   *  and each option here is its own independent EditorElement rather than
   *  something a single updateElement() call could enforce that for. */
  function selectRadioOption(picked: Extract<EditorElement, { type: "form-radio" }>) {
    pushHistory();
    setSelectedElementId(picked.id);
    setElements((prev) =>
      prev.map((el) =>
        el.type === "form-radio" && el.groupName.trim() === picked.groupName.trim()
          ? { ...el, selectedByDefault: el.id === picked.id }
          : el,
      ),
    );
  }

  /** "Delete" on a form-text field auto-detected from the uploaded PDF can't
   *  actually delete the field — it's a real field in the source document,
   *  and this element is just this app's editable overlay for it. Removing
   *  that overlay (as a normal removeElement() would) left nothing on the
   *  page to click back into — with the field's own baked-in appearance
   *  also now disabled (see the annotationMode: 0 fix), that spot went
   *  completely blank and unrecoverable except via Undo. Clearing the value
   *  instead keeps the overlay (and the ability to click back into it and
   *  type something new) while still doing what "remove this text" means
   *  for a real field: emptying it. A field the user drew themselves has no
   *  such original to preserve, so it still deletes outright. */
  function clearOrRemoveFormTextElement(el: Extract<EditorElement, { type: "form-text" }>) {
    if (el.isExisting) {
      pushHistory();
      updateElement(el.id, { defaultValue: "" });
      setSelectedElementId(null);
    } else {
      removeElement(el.id);
    }
  }

  // Scoped to "text" elements specifically — text-edit elements are tied to a
  // specific spot in the original document (itemIndex/baseline), so "duplicating"
  // one wouldn't have a sensible meaning the way copying a text box you added does.
  function duplicateTextElement(el: Extract<EditorElement, { type: "text" }>) {
    const id = createElementId();
    pushHistory();
    setElements((prev) => [...prev, { ...el, id, xPt: el.xPt + 12, yPt: el.yPt + 12 }]);
    setSelectedElementId(id);
  }

  function duplicateShapeElement(el: Extract<EditorElement, { type: "rect" | "ellipse" }>) {
    const id = createElementId();
    pushHistory();
    setElements((prev) => [...prev, { ...el, id, xPt: el.xPt + 12, yPt: el.yPt + 12 }]);
    setSelectedElementId(id);
  }

  function duplicateLineElement(el: Extract<EditorElement, { type: "line" | "arrow" }>) {
    const id = createElementId();
    pushHistory();
    setElements((prev) => [
      ...prev,
      { ...el, id, x1Pt: el.x1Pt + 12, y1Pt: el.y1Pt + 12, x2Pt: el.x2Pt + 12, y2Pt: el.y2Pt + 12 },
    ]);
    setSelectedElementId(id);
  }

  function duplicateDropdownElement(el: Extract<EditorElement, { type: "form-dropdown" }>) {
    const id = createElementId();
    pushHistory();
    // A fresh fieldName, not just a position offset — pdf-lib fields must be
    // uniquely named, and copying the original's name verbatim would collide
    // with it at save time (FieldAlreadyExistsError).
    setElements((prev) => [
      ...prev,
      { ...el, id, xPt: el.xPt + 12, yPt: el.yPt + 12, fieldName: `Dropdown_${createElementId()}` },
    ]);
    setSelectedElementId(id);
  }

  function duplicateFormTextElement(el: Extract<EditorElement, { type: "form-text" }>) {
    const id = createElementId();
    pushHistory();
    // Fresh fieldName + never "isExisting" — a duplicate is a brand-new field
    // in the output PDF, not another widget for whatever field it was copied
    // from (which, for an auto-detected field, is a real field already in
    // the uploaded file).
    setElements((prev) => [
      ...prev,
      {
        ...el,
        id,
        xPt: el.xPt + 12,
        yPt: el.yPt + 12,
        fieldName: `${el.multiline ? "TextArea" : "TextField"}_${createElementId()}`,
        isExisting: false,
      },
    ]);
    setSelectedElementId(id);
  }

  function duplicateImageElement(el: Extract<EditorElement, { type: "image" }>) {
    const id = createElementId();
    pushHistory();
    setElements((prev) => [...prev, { ...el, id, xPt: el.xPt + 12, yPt: el.yPt + 12 }]);
    setSelectedElementId(id);
  }

  function duplicateCheckboxElement(el: Extract<EditorElement, { type: "form-checkbox" }>) {
    const id = createElementId();
    pushHistory();
    // Fresh fieldName — pdf-lib fields must be uniquely named.
    setElements((prev) => [
      ...prev,
      { ...el, id, xPt: el.xPt + 12, yPt: el.yPt + 12, fieldName: `Checkbox_${createElementId()}` },
    ]);
    setSelectedElementId(id);
  }

  function duplicateRadioElement(el: Extract<EditorElement, { type: "form-radio" }>) {
    const id = createElementId();
    pushHistory();
    // Same group by default (another option in the same choice), with a
    // fresh option label so it doesn't collide with the one it was copied
    // from, and never pre-selected (only one option in a group should start
    // selected, and the original already has that role if it had it).
    setElements((prev) => [
      ...prev,
      {
        ...el,
        id,
        xPt: el.xPt + 12,
        yPt: el.yPt + 12,
        optionLabel: `${el.optionLabel} copy`,
        selectedByDefault: false,
      },
    ]);
    setSelectedElementId(id);
  }

  function buildTextEditElement(item: DetectedTextItem, pageIndex: number, text: string): EditorElement {
    const id = createElementId();
    // item.widthPt is pdf.js's measurement of the original text in its real
    // (possibly embedded) PDF font — but the editing textarea renders with a
    // CSS font substitute (Helvetica/Georgia/Courier), which can be wider for
    // the same string/size. Using item.widthPt as-is could start the box too
    // narrow for how it's about to actually render, clipping the tail of the
    // text the moment it's focused, before any edit is even made.
    const renderedWidthPt = Math.max(
      item.widthPt,
      measureTextWidthPt(text, item.fontSizePt, item.fontFamily as FontFamilyGuess, item.isBold),
    );
    return {
      id,
      pageIndex,
      type: "text-edit",
      itemIndex: item.itemIndex,
      xPt: item.xPt,
      topPt: item.topPt,
      widthPt: renderedWidthPt,
      // Deliberately the TRUE pdf.js-detected width, not renderedWidthPt above —
      // this is the floor the background mask should never exceed just because
      // the editing textarea needed extra room for a wider CSS font substitute.
      // Using renderedWidthPt here made the mask visibly wider than the real
      // original background region whenever the CSS fallback font rendered
      // wider than the actual (possibly embedded) PDF font, overflowing onto
      // whatever different-colored content sat just past the real text.
      originalWidthPt: item.widthPt,
      originalText: item.str,
      heightPt: item.heightPt,
      baselinePt: item.baselinePt,
      fontSizePt: item.fontSizePt,
      text,
      color: item.inkColorHex ?? getReadableTextColor(item.bgColorHex),
      bgColorHex: item.bgColorHex,
      fontFamily: item.fontFamily,
      isBold: item.isBold,
      isItalic: item.isItalic,
    };
  }

  function activateTextItem(item: DetectedTextItem) {
    const el = buildTextEditElement(item, currentPage, item.str);
    addElement(el);
    setSelectedElementId(el.id);
  }

  async function openFindReplace() {
    setShowFindReplace(true);
    if (!pdfDoc) return;
    setIsIndexingSearch(true);
    const perPage: DetectedTextItem[][] = [];
    for (let i = 0; i < pageCount; i++) {
      perPage.push(i === currentPage ? textItems : await renderAndDetectPage(pdfDoc, i));
    }
    setSearchIndexByPage(perPage);
    setReplacedKeys(new Set());
    setIsIndexingSearch(false);
  }

  function matchKey(pageIndex: number, itemIndex: number) {
    return `${pageIndex}:${itemIndex}`;
  }

  function findAllMatches(): { pageIndex: number; item: DetectedTextItem }[] {
    const needle = findQuery.trim();
    if (!needle) return [];
    const needleCmp = matchCase ? needle : needle.toLowerCase();
    const matches: { pageIndex: number; item: DetectedTextItem }[] = [];
    searchIndexByPage.forEach((items, pageIndex) => {
      items.forEach((item) => {
        if (replacedKeys.has(matchKey(pageIndex, item.itemIndex))) return;
        const haystack = matchCase ? item.str : item.str.toLowerCase();
        if (haystack.includes(needleCmp)) matches.push({ pageIndex, item });
      });
    });
    return matches;
  }

  function replaceMatch(match: { pageIndex: number; item: DetectedTextItem }) {
    const needle = matchCase ? findQuery.trim() : findQuery.trim().toLowerCase();
    const flags = matchCase ? "g" : "gi";
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const newText = match.item.str.replace(new RegExp(escaped, flags), replaceQuery);
    addElement(buildTextEditElement(match.item, match.pageIndex, newText));
    setReplacedKeys((prev) => new Set(prev).add(matchKey(match.pageIndex, match.item.itemIndex)));
  }

  function replaceAllMatches() {
    findAllMatches().forEach(replaceMatch);
  }

  function startPan(event: React.PointerEvent) {
    const container = scrollContainerRef.current;
    if (!container) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const startScrollLeft = container.scrollLeft;
    const startScrollTop = container.scrollTop;
    setIsPanning(true);

    function onMove(moveEvent: PointerEvent) {
      scrollContainerRef.current!.scrollLeft = startScrollLeft - (moveEvent.clientX - startX);
      scrollContainerRef.current!.scrollTop = startScrollTop - (moveEvent.clientY - startY);
    }
    function onUp() {
      setIsPanning(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function handleOverlayPointerDown(event: React.PointerEvent) {
    if (event.target !== event.currentTarget) return;
    setSelectedElementId(null);

    if (activeTool === "cursor") {
      startPan(event);
      return;
    }

    const point = toPagePoint(event);

    if (activeTool === "draw") {
      setDrawingPath([point]);
      return;
    }

    if (activeTool === "shapes" && (shapeType === "line" || shapeType === "arrow")) {
      setLineDraft({ start: point, current: point });
      return;
    }

    if (activeTool === "whiteout") {
      setWhiteoutDraft({ start: point, current: point });
      return;
    }

    if (!CLICK_TO_ADD.includes(activeTool)) return;

    if (activeTool === "text") {
      const id = createElementId();
      addElement({
        id,
        pageIndex: currentPage,
        type: "text",
        xPt: point.x,
        yPt: point.y,
        widthPt: 200,
        text: "Text",
        color: activeColorHex,
        fontSizePt: DEFAULT_TEXT_FONT_SIZE_PT,
        fontFamily: "sans-serif",
        isBold: false,
        isItalic: false,
      });
      setSelectedElementId(id);
    } else if (activeTool === "shapes") {
      const id = createElementId();
      addElement({
        id,
        pageIndex: currentPage,
        type: shapeType === "circle" ? "ellipse" : "rect",
        xPt: point.x - 60,
        yPt: point.y - 40,
        widthPt: 120,
        heightPt: 80,
        color: activeColorHex,
        strokeWidthPt: 2,
        fillColorHex: null,
      });
      setSelectedElementId(id);
    } else if (activeTool === "highlight") {
      addElement({
        id: createElementId(),
        pageIndex: currentPage,
        type: "highlight",
        xPt: point.x - 75,
        yPt: point.y - 10,
        widthPt: 150,
        heightPt: 20,
        color: activeColorHex,
      });
    } else if (activeTool === "link") {
      addElement({
        id: createElementId(),
        pageIndex: currentPage,
        type: "link",
        xPt: point.x - 60,
        yPt: point.y - 12,
        widthPt: 120,
        heightPt: 24,
        url: "",
      });
    } else if (activeTool === "form-text") {
      const xPt = point.x - 75;
      const yPt = point.y - 12;
      const widthPt = 150;
      const heightPt = 24;
      addElement({
        id: createElementId(),
        pageIndex: currentPage,
        type: "form-text",
        xPt,
        yPt,
        widthPt,
        heightPt,
        fieldName: `TextField_${createElementId()}`,
        defaultValue: "",
        multiline: false,
        isExisting: false,
        textColor: readableFormTextColorAt(xPt, yPt, widthPt, heightPt),
        borderColor: "#000000",
        fontSizePt: 11,
        align: "left",
        required: false,
      });
    } else if (activeTool === "form-multiline") {
      const xPt = point.x - 90;
      const yPt = point.y - 30;
      const widthPt = 180;
      const heightPt = 60;
      addElement({
        id: createElementId(),
        pageIndex: currentPage,
        type: "form-text",
        xPt,
        yPt,
        widthPt,
        heightPt,
        fieldName: `TextArea_${createElementId()}`,
        defaultValue: "",
        multiline: true,
        isExisting: false,
        textColor: readableFormTextColorAt(xPt, yPt, widthPt, heightPt),
        borderColor: "#000000",
        fontSizePt: 11,
        align: "left",
        required: false,
      });
    } else if (activeTool === "form-dropdown") {
      const xPt = point.x - 75;
      const yPt = point.y - 14;
      const widthPt = 150;
      const heightPt = 28;
      addElement({
        id: createElementId(),
        pageIndex: currentPage,
        type: "form-dropdown",
        xPt,
        yPt,
        widthPt,
        heightPt,
        fieldName: `Dropdown_${createElementId()}`,
        optionsText: "Option 1\nOption 2\nOption 3",
        selectedValue: "",
        textColor: readableFormTextColorAt(xPt, yPt, widthPt, heightPt),
        borderColor: "#000000",
        fontSizePt: 11,
        align: "left",
        multiSelect: false,
        required: false,
      });
    } else if (activeTool === "form-radio") {
      const xPt = point.x - 10;
      const yPt = point.y - 10;
      const widthPt = 20;
      const heightPt = 20;
      addElement({
        id: createElementId(),
        pageIndex: currentPage,
        type: "form-radio",
        xPt,
        yPt,
        widthPt,
        heightPt,
        groupName: "RadioGroup1",
        optionLabel: `Option ${elements.filter((el) => el.type === "form-radio").length + 1}`,
        selectedByDefault: false,
        textColor: readableFormTextColorAt(xPt, yPt, widthPt, heightPt),
        borderColor: "#000000",
        required: false,
      });
    } else if (activeTool === "form-checkbox") {
      const xPt = point.x - 9;
      const yPt = point.y - 9;
      const widthPt = 18;
      const heightPt = 18;
      addElement({
        id: createElementId(),
        pageIndex: currentPage,
        type: "form-checkbox",
        xPt,
        yPt,
        widthPt,
        heightPt,
        fieldName: `Checkbox_${createElementId()}`,
        checked: false,
        textColor: readableFormTextColorAt(xPt, yPt, widthPt, heightPt),
        borderColor: "#000000",
        required: false,
      });
    } else if (activeTool === "stamp-x" || activeTool === "stamp-check" || activeTool === "stamp-dot") {
      addElement({
        id: createElementId(),
        pageIndex: currentPage,
        type: "stamp",
        xPt: point.x - 12,
        yPt: point.y - 12,
        widthPt: 24,
        heightPt: 24,
        kind: activeTool === "stamp-x" ? "x" : activeTool === "stamp-check" ? "check" : "dot",
        color: activeColorHex,
      });
    }
  }

  function handleOverlayPointerMove(event: React.PointerEvent) {
    if (activeTool === "draw" && drawingPath) {
      setDrawingPath((prev) => (prev ? [...prev, toPagePoint(event)] : prev));
    } else if (activeTool === "shapes" && (shapeType === "line" || shapeType === "arrow") && lineDraft) {
      setLineDraft((prev) => (prev ? { ...prev, current: toPagePoint(event) } : prev));
    } else if (activeTool === "whiteout" && whiteoutDraft) {
      setWhiteoutDraft((prev) => (prev ? { ...prev, current: toPagePoint(event) } : prev));
    }
  }

  function handleOverlayPointerUp() {
    if (activeTool === "draw" && drawingPath && drawingPath.length > 1) {
      addElement({
        id: createElementId(),
        pageIndex: currentPage,
        type: "path",
        points: drawingPath,
        color: activeColorHex,
        strokeWidthPt: activePenStrokeWidthPt,
      });
    }
    if (activeTool === "shapes" && (shapeType === "line" || shapeType === "arrow") && lineDraft) {
      const { start, current } = lineDraft;
      if (Math.hypot(current.x - start.x, current.y - start.y) > 2) {
        const id = createElementId();
        addElement({
          id,
          pageIndex: currentPage,
          type: shapeType === "arrow" ? "arrow" : "line",
          x1Pt: start.x,
          y1Pt: start.y,
          x2Pt: current.x,
          y2Pt: current.y,
          color: activeColorHex,
          strokeWidthPt: 2,
        });
        setSelectedElementId(id);
      }
    }
    if (activeTool === "whiteout" && whiteoutDraft) {
      const { start, current } = whiteoutDraft;
      const widthPt = Math.abs(current.x - start.x);
      const heightPt = Math.abs(current.y - start.y);
      const id = createElementId();
      // A real drag draws exactly that rectangle; a plain click (no
      // meaningful drag distance) falls back to a sensible default size
      // centered on the click, instead of forcing every whiteout to be
      // drawn out by hand.
      const usedDrag = widthPt > 4 || heightPt > 4;
      addElement({
        id,
        pageIndex: currentPage,
        type: "whiteout",
        xPt: usedDrag ? Math.min(start.x, current.x) : start.x - 75,
        yPt: usedDrag ? Math.min(start.y, current.y) : start.y - 15,
        widthPt: usedDrag ? widthPt : 150,
        heightPt: usedDrag ? heightPt : 30,
      });
      setSelectedElementId(id);
    }
    setDrawingPath(null);
    setLineDraft(null);
    setWhiteoutDraft(null);
  }

  function startElementDrag(el: EditorElement, event: React.PointerEvent) {
    event.stopPropagation();
    if (activeTool === "erase") {
      removeElement(el.id);
      return;
    }
    if (el.type === "path" || el.type === "text-edit" || el.type === "line" || el.type === "arrow") return;

    pushHistory();

    const startX = event.clientX;
    const startY = event.clientY;
    const startXPt = el.xPt;
    const startYPt = el.yPt;

    function onMove(moveEvent: PointerEvent) {
      const dxPt = (moveEvent.clientX - startX) / scale;
      const dyPt = (moveEvent.clientY - startY) / scale;
      updateElement(el.id, { xPt: startXPt + dxPt, yPt: startYPt + dyPt });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function startLineDrag(el: Extract<EditorElement, { type: "line" | "arrow" }>, event: React.PointerEvent) {
    event.stopPropagation();
    setSelectedElementId(el.id);
    if (activeTool === "erase") {
      removeElement(el.id);
      return;
    }
    if (activeTool !== "cursor") return;

    pushHistory();
    const startX = event.clientX;
    const startY = event.clientY;
    const { x1Pt, y1Pt, x2Pt, y2Pt } = el;

    function onMove(moveEvent: PointerEvent) {
      const dxPt = (moveEvent.clientX - startX) / scale;
      const dyPt = (moveEvent.clientY - startY) / scale;
      updateElement(el.id, { x1Pt: x1Pt + dxPt, y1Pt: y1Pt + dyPt, x2Pt: x2Pt + dxPt, y2Pt: y2Pt + dyPt });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  // Handle defaults to "se" (bottom-right, growing away from the fixed
  // top-left corner). Each of the 8 handles keeps the *opposite* edge
  // anchored (e.g. dragging the west/left handle keeps the right edge fixed
  // and moves xPt), which is what makes resizing from any corner or edge
  // feel natural instead of the box always jumping to re-anchor at its
  // top-left. Text boxes don't reach this at all anymore — no resize handles
  // render for them (see the RESIZE_HANDLES.map below), so their size only
  // changes via the floating TextEditToolbar's own size control; only drag-
  // to-move is left on the canvas for text.
  function startElementResize(el: EditorElement, event: React.PointerEvent, handle: ResizeHandle = "se") {
    event.stopPropagation();
    if (el.type === "path" || el.type === "text-edit" || el.type === "line" || el.type === "arrow" || el.type === "text") return;

    pushHistory();

    // Pointer capture pins this drag's move/up events to the handle itself
    // for the rest of the gesture — without it, a release that happens while
    // the cursor has drifted off the (now very thin) handle strip, or onto a
    // different element mid-drag, can fail to reach the cleanup below, and
    // the resize never gets the pointerup that's supposed to stop it.
    const handleEl = event.currentTarget;
    const pointerId = event.pointerId;
    handleEl.setPointerCapture(pointerId);

    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = el.widthPt;
    const startXPt = el.xPt;
    const startYPt = el.yPt;
    const startHeight = el.heightPt;

    // Coalesced to one update per animation frame — pointermove can fire far
    // more often than the browser actually repaints, and processing every
    // single one did more work than the screen could show anyway.
    let rafId: number | null = null;
    let latestMoveEvent: PointerEvent | null = null;

    function processMove(moveEvent: PointerEvent) {
      const dxPt = (moveEvent.clientX - startX) / scale;
      const dyPt = (moveEvent.clientY - startY) / scale;

      const patch: { xPt?: number; yPt?: number; widthPt?: number; heightPt?: number } = {};
      const west = handle === "w" || handle === "nw" || handle === "sw";
      const east = handle === "e" || handle === "ne" || handle === "se";
      const north = handle === "n" || handle === "ne" || handle === "nw";
      const south = handle === "s" || handle === "se" || handle === "sw";

      if (east) {
        patch.widthPt = Math.max(20, startWidth + dxPt);
      } else if (west) {
        const newWidth = Math.max(20, startWidth - dxPt);
        patch.widthPt = newWidth;
        patch.xPt = startXPt + (startWidth - newWidth);
      }
      if (south) {
        patch.heightPt = Math.max(20, startHeight + dyPt);
      } else if (north) {
        const newHeight = Math.max(20, startHeight - dyPt);
        patch.heightPt = newHeight;
        patch.yPt = startYPt + (startHeight - newHeight);
      }
      updateElement(el.id, patch as Partial<EditorElement>);
    }
    function onMove(moveEvent: PointerEvent) {
      latestMoveEvent = moveEvent;
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (latestMoveEvent) processMove(latestMoveEvent);
      });
    }
    function onUp() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      handleEl.releasePointerCapture(pointerId);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function handleToolClick(toolId: ToolId) {
    setActiveTool(toolId);
    if (toolId === "image") {
      imageInputRef.current?.click();
    }
    // "signature" is handled by SignatureMenu itself now (it decides between
    // reopening the pad and showing the saved-signature popover), not here.
  }

  function readAsDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function handleImageSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;

    const dataUrl = await readAsDataUrl(selected);
    const naturalSize = await new Promise<{ width: number; height: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.src = dataUrl;
    });

    const maxWidthPt = pageSizePt.width * 0.5 || 200;
    const aspect = naturalSize.height / naturalSize.width || 1;
    const widthPt = Math.min(maxWidthPt, naturalSize.width);
    const heightPt = widthPt * aspect;

    addElement({
      id: createElementId(),
      pageIndex: currentPage,
      type: "image",
      xPt: (pageSizePt.width - widthPt) / 2,
      yPt: (pageSizePt.height - heightPt) / 2,
      widthPt,
      heightPt,
      dataUrl,
      mimeType: selected.type === "image/png" ? "image/png" : "image/jpeg",
      rotationDeg: 0,
    });
  }

  function handleSignatureConfirm(dataUrl: string, remember = true) {
    const widthPt = Math.min(pageSizePt.width * 0.4 || 160, 220);
    const heightPt = widthPt * (200 / 600);
    const center = visibleCenterPagePoint();
    addElement({
      id: createElementId(),
      pageIndex: currentPage,
      type: "image",
      xPt: center.x - widthPt / 2,
      yPt: center.y - heightPt / 2,
      widthPt,
      heightPt,
      dataUrl,
      mimeType: "image/png",
      rotationDeg: 0,
    });
    if (remember) setSavedSignature(dataUrl);
    setShowSignaturePad(false);
  }

  /** Drops the already-saved signature onto the page again — same placement
   *  math as a freshly-drawn one, just skipping the drawing pad entirely. */
  function useExistingSignature(dataUrl: string) {
    const widthPt = Math.min(pageSizePt.width * 0.4 || 160, 220);
    const heightPt = widthPt * (200 / 600);
    const center = visibleCenterPagePoint();
    addElement({
      id: createElementId(),
      pageIndex: currentPage,
      type: "image",
      xPt: center.x - widthPt / 2,
      yPt: center.y - heightPt / 2,
      widthPt,
      heightPt,
      dataUrl,
      mimeType: "image/png",
      rotationDeg: 0,
    });
  }

  async function reloadFileBytes(bytes: Uint8Array, name: string) {
    const newFile = new File([bytes as BlobPart], name, { type: "application/pdf" });
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setStatus("idle");
    setShowSuccessModal(false);
    setFile(newFile);
    const pdfjs = await loadPdfjs();
    const doc = await pdfjs.getDocument({ data: bytes }).promise;
    setPdfDoc(doc);
    setPageCount(doc.numPages);
  }

  async function deleteCurrentPage() {
    if (!file || pageCount <= 1 || pageOpBusy) return;
    setPageOpBusy(true);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const bytes = await readPdfBytes(file);
      const doc = await PDFDocument.load(bytes);
      doc.removePage(currentPage);
      const newPageCount = doc.getPageCount();
      const outBytes = await doc.save();

      pushHistory();
      setElements((prev) =>
        prev
          .filter((el) => el.pageIndex !== currentPage)
          .map((el) => (el.pageIndex > currentPage ? { ...el, pageIndex: el.pageIndex - 1 } : el)),
      );
      setCurrentPage((p) => Math.min(p, newPageCount - 1));
      await reloadFileBytes(outBytes, file.name);
    } finally {
      setPageOpBusy(false);
    }
  }

  async function rotateCurrentPage(deltaDeg: number) {
    if (!file || pageOpBusy) return;
    setPageOpBusy(true);
    try {
      const { PDFDocument, degrees } = await import("pdf-lib");
      const bytes = await readPdfBytes(file);
      const doc = await PDFDocument.load(bytes);
      const page = doc.getPage(currentPage);
      const nextAngle = ((page.getRotation().angle + deltaDeg) % 360 + 360) % 360;
      page.setRotation(degrees(nextAngle));
      const outBytes = await doc.save();
      await reloadFileBytes(outBytes, file.name);
    } finally {
      setPageOpBusy(false);
    }
  }

  async function insertPageAfterCurrent() {
    if (!file || pageOpBusy) return;
    setPageOpBusy(true);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const bytes = await readPdfBytes(file);
      const doc = await PDFDocument.load(bytes);
      const { width, height } = doc.getPage(currentPage).getSize();
      doc.insertPage(currentPage + 1, [width, height]);
      const outBytes = await doc.save();

      pushHistory();
      setElements((prev) => prev.map((el) => (el.pageIndex > currentPage ? { ...el, pageIndex: el.pageIndex + 1 } : el)));
      await reloadFileBytes(outBytes, file.name);
      setCurrentPage((p) => p + 1);
    } finally {
      setPageOpBusy(false);
    }
  }

  async function handleSave() {
    // The floating and filename-bar Save buttons both call this, and both
    // only disable via `status === "saving"` — a re-render lagging one tick
    // behind a rapid double-click could otherwise let two saves overlap.
    if (!file || status === "saving") return;
    setStatus("saving");
    setErrorMessage("");

    try {
      const { PDFDocument, StandardFonts, rgb, PDFName, PDFString, TextAlignment, degrees } = await import("pdf-lib");
      const bytes = await readPdfBytes(file);
      const doc = await PDFDocument.load(bytes);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      // Standard (built-in, no file to fetch) fonts — cheap to embed all 12
      // family/weight/style variants up front so text elements can pick a
      // closer-matching standard font instead of always regular Helvetica.
      const fontVariants: Record<FontFamilyGuess, Record<"regular" | "bold" | "italic" | "boldItalic", Awaited<ReturnType<typeof doc.embedFont>>>> = {
        "sans-serif": {
          regular: font,
          bold: await doc.embedFont(StandardFonts.HelveticaBold),
          italic: await doc.embedFont(StandardFonts.HelveticaOblique),
          boldItalic: await doc.embedFont(StandardFonts.HelveticaBoldOblique),
        },
        serif: {
          regular: await doc.embedFont(StandardFonts.TimesRoman),
          bold: await doc.embedFont(StandardFonts.TimesRomanBold),
          italic: await doc.embedFont(StandardFonts.TimesRomanItalic),
          boldItalic: await doc.embedFont(StandardFonts.TimesRomanBoldItalic),
        },
        monospace: {
          regular: await doc.embedFont(StandardFonts.Courier),
          bold: await doc.embedFont(StandardFonts.CourierBold),
          italic: await doc.embedFont(StandardFonts.CourierOblique),
          boldItalic: await doc.embedFont(StandardFonts.CourierBoldOblique),
        },
      };
      const getFont = (family: FontFamilyGuess, isBold: boolean, isItalic: boolean) =>
        fontVariants[family][isBold && isItalic ? "boldItalic" : isBold ? "bold" : isItalic ? "italic" : "regular"];
      const imageCache = new Map<string, Awaited<ReturnType<typeof doc.embedPng>>>();
      // Form fields need an AcroForm — created lazily so plain PDFs with no
      // form-field elements don't get one added for no reason.
      let form: ReturnType<typeof doc.getForm> | null = null;
      const ensureForm = () => (form ??= doc.getForm());
      // Radio buttons that share a group name become options of one PDFRadioGroup —
      // the group itself must only be created once, then each option added to it.
      const radioGroupCache = new Map<string, ReturnType<ReturnType<typeof doc.getForm>["createRadioGroup"]>>();
      const ensureRadioGroup = (groupName: string) => {
        let group = radioGroupCache.get(groupName);
        if (!group) {
          group = ensureForm().createRadioGroup(groupName);
          radioGroupCache.set(groupName, group);
        }
        return group;
      };
      // select() validates the option against the group's already-added
      // options, so it can only run once every "form-radio" element (which
      // might land anywhere in this loop, for any group) has had its option
      // added — collected here and applied in one pass after the loop below.
      const pendingRadioSelections = new Map<string, string>();

      for (const el of elements) {
        const page = doc.getPage(el.pageIndex);
        const { height: pageHeightPt } = page.getSize();
        const [r, g, b] = hexToRgbFloat("color" in el ? el.color : "#000000");

        if (el.type === "text") {
          if (!el.text.trim()) continue;
          // No maxWidth — the on-screen box is always grown to fit the
          // longest line (wrap is off there too), so the saved PDF should
          // only break lines where the user actually typed Enter, never
          // because pdf-lib's own font metrics judged a line "too wide."
          page.drawText(el.text, {
            x: el.xPt,
            y: pageHeightPt - el.yPt - el.fontSizePt,
            size: el.fontSizePt,
            font: getFont(el.fontFamily, el.isBold, el.isItalic),
            color: rgb(r, g, b),
            lineHeight: el.fontSizePt * 1.2,
          });
        } else if (el.type === "rect") {
          const fill = el.fillColorHex ? hexToRgbFloat(el.fillColorHex) : null;
          page.drawRectangle({
            x: el.xPt,
            y: pageHeightPt - el.yPt - el.heightPt,
            width: el.widthPt,
            height: el.heightPt,
            ...(el.strokeWidthPt > 0 ? { borderColor: rgb(r, g, b), borderWidth: el.strokeWidthPt } : {}),
            ...(fill ? { color: rgb(fill[0], fill[1], fill[2]) } : {}),
          });
        } else if (el.type === "highlight") {
          page.drawRectangle({
            x: el.xPt,
            y: pageHeightPt - el.yPt - el.heightPt,
            width: el.widthPt,
            height: el.heightPt,
            color: rgb(r, g, b),
            opacity: 0.35,
          });
        } else if (el.type === "ellipse") {
          const fill = el.fillColorHex ? hexToRgbFloat(el.fillColorHex) : null;
          page.drawEllipse({
            x: el.xPt + el.widthPt / 2,
            y: pageHeightPt - el.yPt - el.heightPt / 2,
            xScale: el.widthPt / 2,
            yScale: el.heightPt / 2,
            ...(el.strokeWidthPt > 0 ? { borderColor: rgb(r, g, b), borderWidth: el.strokeWidthPt } : {}),
            ...(fill ? { color: rgb(fill[0], fill[1], fill[2]) } : {}),
          });
        } else if (el.type === "line") {
          page.drawLine({
            start: { x: el.x1Pt, y: pageHeightPt - el.y1Pt },
            end: { x: el.x2Pt, y: pageHeightPt - el.y2Pt },
            thickness: el.strokeWidthPt,
            color: rgb(r, g, b),
          });
        } else if (el.type === "arrow") {
          const start = { x: el.x1Pt, y: pageHeightPt - el.y1Pt };
          const end = { x: el.x2Pt, y: pageHeightPt - el.y2Pt };
          page.drawLine({ start, end, thickness: el.strokeWidthPt, color: rgb(r, g, b) });
          const headLen = Math.max(8, el.strokeWidthPt * 4);
          for (const [wx, wy] of arrowHeadWings(start.x, start.y, end.x, end.y, headLen)) {
            page.drawLine({ start: end, end: { x: wx, y: wy }, thickness: el.strokeWidthPt, color: rgb(r, g, b) });
          }
        } else if (el.type === "link") {
          if (!el.url.trim()) continue;
          const uriAction = doc.context.obj({
            Type: "Action",
            S: "URI",
            URI: PDFString.of(el.url.trim()),
          });
          const linkAnnotation = doc.context.obj({
            Type: "Annot",
            Subtype: "Link",
            Rect: [el.xPt, pageHeightPt - el.yPt - el.heightPt, el.xPt + el.widthPt, pageHeightPt - el.yPt],
            Border: [0, 0, 0],
            A: uriAction,
          });
          const linkRef = doc.context.register(linkAnnotation);
          const existingAnnots = page.node.Annots();
          if (existingAnnots) {
            existingAnnots.push(linkRef);
          } else {
            page.node.set(PDFName.of("Annots"), doc.context.obj([linkRef]));
          }
        } else if (el.type === "whiteout") {
          page.drawRectangle({
            x: el.xPt,
            y: pageHeightPt - el.yPt - el.heightPt,
            width: el.widthPt,
            height: el.heightPt,
            color: rgb(1, 1, 1),
          });
        } else if (el.type === "form-text") {
          const textAlignment =
            el.align === "center" ? TextAlignment.Center : el.align === "right" ? TextAlignment.Right : TextAlignment.Left;
          if (el.isExisting) {
            // Auto-detected from the uploaded PDF's own AcroForm — its widget
            // is already on the page at the right spot in the original file,
            // so this only needs to update the value, not place anything.
            // Calling addToPage again would draw a second, duplicate widget
            // right on top of the real one. Border color can't be changed
            // this way (that's baked into the widget's own appearance at
            // creation time), but font size/alignment/required still apply.
            const field = ensureForm().getTextField(el.fieldName);
            if (el.multiline) field.enableMultiline();
            field.setText(el.defaultValue);
            field.setFontSize(el.fontSizePt);
            field.setAlignment(textAlignment);
            if (el.required) field.enableRequired();
          } else {
            const field = ensureForm().createTextField(el.fieldName);
            if (el.multiline) field.enableMultiline();
            if (el.defaultValue) field.setText(el.defaultValue);
            if (el.required) field.enableRequired();
            const [formTextR, formTextG, formTextB] = hexToRgbFloat(el.textColor);
            const [formBorderR, formBorderG, formBorderB] = hexToRgbFloat(el.borderColor);
            field.addToPage(page, {
              x: el.xPt,
              y: pageHeightPt - el.yPt - el.heightPt,
              width: el.widthPt,
              height: el.heightPt,
              textColor: rgb(formTextR, formTextG, formTextB),
              borderColor: rgb(formBorderR, formBorderG, formBorderB),
              borderWidth: 1,
            });
            field.setFontSize(el.fontSizePt);
            field.setAlignment(textAlignment);
          }
        } else if (el.type === "form-dropdown") {
          const options = el.optionsText
            .split("\n")
            .map((o) => o.trim())
            .filter(Boolean);
          if (options.length === 0) continue;
          const field = ensureForm().createDropdown(el.fieldName);
          field.setOptions(options);
          if (el.multiSelect) field.enableMultiselect();
          if (el.required) field.enableRequired();
          if (el.selectedValue && options.includes(el.selectedValue)) field.select(el.selectedValue);
          const [dropdownTextR, dropdownTextG, dropdownTextB] = hexToRgbFloat(el.textColor);
          const [dropdownBorderR, dropdownBorderG, dropdownBorderB] = hexToRgbFloat(el.borderColor);
          field.addToPage(page, {
            x: el.xPt,
            y: pageHeightPt - el.yPt - el.heightPt,
            width: el.widthPt,
            height: el.heightPt,
            textColor: rgb(dropdownTextR, dropdownTextG, dropdownTextB),
            borderColor: rgb(dropdownBorderR, dropdownBorderG, dropdownBorderB),
            borderWidth: 1,
          });
          // setFontSize needs the field's default appearance (/DA) to already
          // exist — addToPage above is what creates it, so this has to run
          // after, not before.
          field.setFontSize(el.fontSizePt);
        } else if (el.type === "form-radio") {
          if (!el.groupName.trim() || !el.optionLabel.trim()) continue;
          const groupName = el.groupName.trim();
          const optionLabel = el.optionLabel.trim();
          const [radioTextR, radioTextG, radioTextB] = hexToRgbFloat(el.textColor);
          const [radioBorderR, radioBorderG, radioBorderB] = hexToRgbFloat(el.borderColor);
          const radioGroup = ensureRadioGroup(groupName);
          radioGroup.addOptionToPage(optionLabel, page, {
            x: el.xPt,
            y: pageHeightPt - el.yPt - el.heightPt,
            width: el.widthPt,
            height: el.heightPt,
            textColor: rgb(radioTextR, radioTextG, radioTextB),
            borderColor: rgb(radioBorderR, radioBorderG, radioBorderB),
            borderWidth: 1,
          });
          if (el.required) radioGroup.enableRequired();
          if (el.selectedByDefault) pendingRadioSelections.set(groupName, optionLabel);
        } else if (el.type === "form-checkbox") {
          const [checkboxTextR, checkboxTextG, checkboxTextB] = hexToRgbFloat(el.textColor);
          const [checkboxBorderR, checkboxBorderG, checkboxBorderB] = hexToRgbFloat(el.borderColor);
          const checkboxField = ensureForm().createCheckBox(el.fieldName);
          if (el.required) checkboxField.enableRequired();
          checkboxField.addToPage(page, {
            x: el.xPt,
            y: pageHeightPt - el.yPt - el.heightPt,
            width: el.widthPt,
            height: el.heightPt,
            textColor: rgb(checkboxTextR, checkboxTextG, checkboxTextB),
            borderColor: rgb(checkboxBorderR, checkboxBorderG, checkboxBorderB),
            borderWidth: 1,
          });
          if (el.checked) checkboxField.check();
        } else if (el.type === "stamp") {
          const cx = el.xPt + el.widthPt / 2;
          const cy = pageHeightPt - el.yPt - el.heightPt / 2;
          const half = Math.min(el.widthPt, el.heightPt) / 2;
          if (el.kind === "x") {
            page.drawLine({ start: { x: cx - half, y: cy + half }, end: { x: cx + half, y: cy - half }, thickness: 2.5, color: rgb(r, g, b) });
            page.drawLine({ start: { x: cx - half, y: cy - half }, end: { x: cx + half, y: cy + half }, thickness: 2.5, color: rgb(r, g, b) });
          } else if (el.kind === "check") {
            page.drawLine({ start: { x: cx - half, y: cy }, end: { x: cx - half / 4, y: cy - half }, thickness: 2.5, color: rgb(r, g, b) });
            page.drawLine({ start: { x: cx - half / 4, y: cy - half }, end: { x: cx + half, y: cy + half }, thickness: 2.5, color: rgb(r, g, b) });
          } else {
            page.drawEllipse({ x: cx, y: cy, xScale: half * 0.6, yScale: half * 0.6, color: rgb(r, g, b) });
          }
        } else if (el.type === "image") {
          let image = imageCache.get(el.dataUrl);
          if (!image) {
            const res = await fetch(el.dataUrl);
            const buf = await res.arrayBuffer();
            image = el.mimeType === "image/png" ? await doc.embedPng(buf) : await doc.embedJpg(buf);
            imageCache.set(el.dataUrl, image);
          }
          if (el.rotationDeg === 0) {
            page.drawImage(image, {
              x: el.xPt,
              y: pageHeightPt - el.yPt - el.heightPt,
              width: el.widthPt,
              height: el.heightPt,
            });
          } else {
            // pdf-lib's drawImage rotates around the (x, y) anchor itself (the
            // pre-rotation bottom-left corner), not the image's center — so
            // rotating in place needs a recomputed anchor that keeps the true
            // center fixed, matching what the on-screen CSS rotate() already
            // shows. Also negated: pdf-lib's rotation is counter-clockwise in
            // PDF's y-up space, which displays as counter-clockwise on a
            // normal (y-down) screen — opposite of CSS's clockwise-positive
            // rotate(), which is what rotationDeg is defined to match.
            const cx = el.xPt + el.widthPt / 2;
            const cy = pageHeightPt - el.yPt - el.heightPt / 2;
            const pdfAngleDeg = -el.rotationDeg;
            const rad = (pdfAngleDeg * Math.PI) / 180;
            const halfW = el.widthPt / 2;
            const halfH = el.heightPt / 2;
            const anchorX = cx - (halfW * Math.cos(rad) - halfH * Math.sin(rad));
            const anchorY = cy - (halfW * Math.sin(rad) + halfH * Math.cos(rad));
            page.drawImage(image, {
              x: anchorX,
              y: anchorY,
              width: el.widthPt,
              height: el.heightPt,
              rotate: degrees(pdfAngleDeg),
            });
          }
        } else if (el.type === "path") {
          for (let i = 1; i < el.points.length; i++) {
            const p1 = el.points[i - 1];
            const p2 = el.points[i];
            page.drawLine({
              start: { x: p1.x, y: pageHeightPt - p1.y },
              end: { x: p2.x, y: pageHeightPt - p2.y },
              thickness: el.strokeWidthPt,
              color: rgb(r, g, b),
            });
          }
        } else if (el.type === "text-edit") {
          const editFont = getFont(el.fontFamily, el.isBold, el.isItalic);
          const descentPt = el.heightPt * (1 - ASCENT_RATIO);
          const hPad = 1.5;
          // Vertical padding scales with font size rather than staying a flat
          // 1.5pt — see the matching comment on the on-screen mask above. Without
          // this, larger replacement text could leave a sliver of the original
          // glyphs' descenders visible past the mask in the saved PDF itself, not
          // just in the live preview.
          const vPad = Math.max(1.5, el.fontSizePt * 0.15);
          // Growth beyond originalWidthPt is measured as "how much wider is the
          // replacement than the original," both in the SAME (standard) font —
          // not "how wide is the replacement vs. originalWidthPt" directly,
          // which mixes widths from two different fonts (the original's real,
          // possibly-embedded font vs. this standard substitute) and made the
          // mask overflow past the true original background whenever the
          // substitute simply rendered the same string wider than the original
          // font did, even with no actual edit.
          const newTextWidthPt = el.text.trim() ? editFont.widthOfTextAtSize(el.text, el.fontSizePt) : 0;
          const originalTextWidthPt = el.originalText.trim() ? editFont.widthOfTextAtSize(el.originalText, el.fontSizePt) : 0;
          const maskWidth = el.originalWidthPt + Math.max(0, newTextWidthPt - originalTextWidthPt) + hPad * 2;
          const [bgR, bgG, bgB] = hexToRgbFloat(el.bgColorHex);

          // Real editing of existing PDF text isn't possible without rewriting the
          // page's content stream — instead we mask the original glyphs with a
          // rectangle matching the sampled background, then draw the replacement on
          // top in a standard font picked to match the original's family.
          page.drawRectangle({
            x: el.xPt - hPad,
            y: el.baselinePt - descentPt - vPad,
            width: maskWidth,
            height: el.heightPt + vPad * 2,
            color: rgb(bgR, bgG, bgB),
          });

          if (el.text.trim()) {
            page.drawText(el.text, {
              x: el.xPt,
              y: el.baselinePt,
              size: el.fontSizePt,
              font: editFont,
              color: rgb(r, g, b),
            });
          }
        }
      }

      for (const [groupName, optionLabel] of pendingRadioSelections) {
        radioGroupCache.get(groupName)?.select(optionLabel);
      }

      const outBytes = await doc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("done");
      setShowSuccessModal(true);
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, error instanceof Error ? `Couldn't save this PDF: ${error.message}` : "Couldn't save this PDF.",));
    }
  }

  if (!file) {
    return (
      <div className="card p-6">
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const dropped = event.dataTransfer.files?.[0];
            if (dropped) loadFile(dropped);
          }}
          className="flex min-h-48 flex-col items-center justify-center gap-4 rounded-xl py-8 text-center"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ToolIcon name="upload" className="h-6 w-6" />
          </span>
          <div>
            <p className="font-semibold text-base-content">Upload a PDF to start editing</p>
            <p className="mt-1 text-sm text-base-content/60">
              Drag & drop a file here, or choose one from your device.
            </p>
          </div>
          <div className="flex">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-primary btn-md rounded-r-none"
            >
              Choose File
            </button>
            <UploadSourceMenu onFile={loadFile} />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(event) => {
              const selected = event.target.files?.[0];
              if (selected) loadFile(selected);
            }}
          />
        </div>
      </div>
    );
  }

  const pageElements = elements.filter((el) => el.pageIndex === currentPage);
  const textEditElements = pageElements.filter((el) => el.type === "text-edit");
  const activeItemIndexes = new Set(textEditElements.map((el) => el.itemIndex));
  const canvasWidth = pageSizePt.width * scale;
  const canvasHeight = pageSizePt.height * scale;
  const selectedElement = pageElements.find((el) => el.id === selectedElementId);
  const selectedTextElement =
    selectedElement && (selectedElement.type === "text" || selectedElement.type === "text-edit") ? selectedElement : undefined;
  const selectedTextTopPt = selectedTextElement
    ? selectedTextElement.type === "text-edit"
      ? selectedTextElement.topPt
      : selectedTextElement.yPt
    : 0;
  // "text" boxes have no stored height (sized by the textarea's own content), so
  // approximate one from font size using the same line-height factor used to set
  // the textarea's minHeight below — good enough for deciding whether the
  // toolbar should flip below the text instead of above it.
  const selectedTextHeightPt = selectedTextElement
    ? selectedTextElement.type === "text-edit"
      ? selectedTextElement.heightPt
      : selectedTextElement.fontSizePt * 1.4
    : 0;
  const selectedShapeElement =
    selectedElement && (selectedElement.type === "rect" || selectedElement.type === "ellipse") ? selectedElement : undefined;
  // Line and arrow share the exact same shape (two endpoints + color/thickness),
  // so they share this one toolbar too — LineEditToolbar's element type accepts both.
  const selectedLineElement =
    selectedElement && (selectedElement.type === "line" || selectedElement.type === "arrow") ? selectedElement : undefined;
  const selectedDropdownElement = selectedElement && selectedElement.type === "form-dropdown" ? selectedElement : undefined;
  const selectedFormTextElement = selectedElement && selectedElement.type === "form-text" ? selectedElement : undefined;
  const selectedImageElement = selectedElement && selectedElement.type === "image" ? selectedElement : undefined;
  const selectedCheckboxElement = selectedElement && selectedElement.type === "form-checkbox" ? selectedElement : undefined;
  const selectedRadioElement = selectedElement && selectedElement.type === "form-radio" ? selectedElement : undefined;
  const searchMatches = findAllMatches();

  return (
    <div ref={workspaceRef} className="rounded-2xl border border-base-300 bg-base-100">
      {showSuccessModal && downloadUrl && (
        <SaveSuccessModal
          downloadUrl={downloadUrl}
          downloadFileName={file?.name ?? "edited.pdf"}
          onClose={() => setShowSuccessModal(false)}
        />
      )}

      {showSignaturePad && (
        <SignaturePad onConfirm={handleSignatureConfirm} onCancel={() => setShowSignaturePad(false)} />
      )}

      {showFindReplace && (
        <FindReplacePanel
          findQuery={findQuery}
          replaceQuery={replaceQuery}
          matchCase={matchCase}
          matches={searchMatches}
          isIndexing={isIndexingSearch}
          onFindQueryChange={setFindQuery}
          onReplaceQueryChange={setReplaceQuery}
          onMatchCaseChange={setMatchCase}
          onReplace={replaceMatch}
          onReplaceAll={replaceAllMatches}
          onJumpToPage={setCurrentPage}
          onClose={() => setShowFindReplace(false)}
        />
      )}

      {/* Filename/Save bar — stays in normal flow (not pinned) even once the toolbar
          below is stuck to the viewport top, so it doesn't keep eating space while
          scrolled; the floating bottom Save button (further down) takes over
          visibility for saving once this bar has scrolled out of view. */}
      <div ref={fileInfoBarRef} className="flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-b border-base-300 px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <ToolIcon name="edit-pdf" className="h-4 w-4 text-primary" />
          <span className="max-w-[180px] truncate font-medium text-base-content">{file.name}</span>
          <button
            type="button"
            onClick={() => {
              setFile(null);
              setPdfDoc(null);
              setElements([]);
              setPast([]);
              setFuture([]);
            }}
            className="text-xs text-base-content/50 hover:text-error"
          >
            Replace
          </button>
        </div>

        {status === "done" && downloadUrl ? (
          <a href={downloadUrl} download={file?.name ?? "edited.pdf"} className="btn btn-primary btn-sm">
            <ToolIcon name="download" className="h-4 w-4" />
            Download
          </a>
        ) : (
          <button type="button" onClick={handleSave} disabled={status === "saving"} className="btn btn-primary btn-sm">
            {status === "saving" ? "Saving..." : "Save PDF"}
          </button>
        )}
      </div>

      {/* Tool buttons + page controls — this is what actually pins to the viewport
          top once the filename bar above has scrolled past. Plain CSS
          `position: sticky` doesn't work here — the tool-page layout's decorative
          curve sections use `overflow-hidden`, and per spec any ancestor with
          non-visible overflow becomes the sticky containing block, which would
          confine (and effectively disable) it to that non-scrolling box instead of
          the real page scroll. `position: fixed` isn't subject to that, so pinning
          is done by hand in the effect above instead. */}
      {errorMessage && (
        <p className="mx-4 mt-3 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      <div
        ref={toolbarRef}
        className={`z-30 bg-base-100 ${toolbarPinned ? "fixed top-0 shadow-md" : ""}`}
        style={toolbarPinned && toolbarBounds ? { left: toolbarBounds.left, width: toolbarBounds.width } : undefined}
      >

      {/* Horizontally scrollable instead of wrapping — on a narrow/phone
          viewport, wrapping this many tool buttons onto several lines ate a
          lot of vertical space before the page content even started; a
          single scrollable row keeps the toolbar's height constant and lets
          touch/scroll reach whatever tool isn't currently visible. */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-base-300 px-4 py-2 *:shrink-0">
        <button
          type="button"
          onClick={() => handleToolClick("cursor")}
          className={`btn btn-sm gap-1.5 ${activeTool === "cursor" ? "btn-primary" : "btn-ghost"}`}
        >
          <ToolIcon name="cursor" className="h-4 w-4" />
          Select
        </button>

        <button
          type="button"
          onClick={() => handleToolClick("text")}
          className={`btn btn-sm gap-1.5 ${activeTool === "text" ? "btn-primary" : "btn-ghost"}`}
        >
          <ToolIcon name="text-tool" className="h-4 w-4" />
          Text
        </button>

        <button
          type="button"
          onClick={() => handleToolClick("link")}
          className={`btn btn-sm gap-1.5 ${activeTool === "link" ? "btn-primary" : "btn-ghost"}`}
        >
          <ToolIcon name="link" className="h-4 w-4" />
          Links
        </button>

        <ToolbarDropdown
          triggerClassName={`btn btn-sm gap-1.5 ${
            [...stampTypes, ...formFieldTypes].some((t) => t.id === activeTool) ? "btn-primary" : "btn-ghost"
          }`}
          menuClassName="w-56"
          trigger={
            <>
              <ToolIcon name="form-field" className="h-4 w-4" />
              Forms
              <ToolIcon name="chevron-down" className="h-3 w-3" />
            </>
          }
        >
          {(close) => (
            <ul>
              <li className="menu-title text-[10px] tracking-wide uppercase">Add text and symbols</li>
              {stampTypes.map((stampTool) => (
                <li key={stampTool.id}>
                  <button
                    type="button"
                    onClick={() => {
                      handleToolClick(stampTool.id);
                      close();
                    }}
                    className={activeTool === stampTool.id ? "active" : ""}
                  >
                    <ToolIcon name={stampTool.icon} className="h-4 w-4" />
                    {stampTool.label}
                  </button>
                </li>
              ))}

              <li className="menu-title mt-1 text-[10px] tracking-wide uppercase">Add new form fields</li>
              {formFieldTypes.map((formTool) => (
                <li key={formTool.id}>
                  <button
                    type="button"
                    onClick={() => {
                      handleToolClick(formTool.id);
                      close();
                    }}
                    className={activeTool === formTool.id ? "active" : ""}
                  >
                    <ToolIcon name={formTool.icon} className="h-4 w-4" />
                    {formTool.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ToolbarDropdown>

        <button
          type="button"
          onClick={() => handleToolClick("image")}
          className={`btn btn-sm gap-1.5 ${activeTool === "image" ? "btn-primary" : "btn-ghost"}`}
        >
          <ToolIcon name="image-tool" className="h-4 w-4" />
          Images
        </button>

        <SignatureMenu
          active={activeTool === "signature"}
          savedSignature={savedSignature}
          onUseSignature={(dataUrl) => {
            setActiveTool("signature");
            useExistingSignature(dataUrl);
          }}
          onNewSignature={() => {
            setActiveTool("signature");
            setShowSignaturePad(true);
          }}
        />

        <button
          type="button"
          onClick={() => handleToolClick("whiteout")}
          className={`btn btn-sm gap-1.5 ${activeTool === "whiteout" ? "btn-primary" : "btn-ghost"}`}
        >
          <ToolIcon name="whiteout" className="h-4 w-4" />
          Whiteout
        </button>

        <ToolbarDropdown
          triggerClassName={`btn btn-sm gap-1.5 ${annotateTypes.some((t) => t.id === activeTool) ? "btn-primary" : "btn-ghost"}`}
          menuClassName="w-44"
          trigger={
            <>
              <ToolIcon name="pen" className="h-4 w-4" />
              Annotate
              <ToolIcon name="chevron-down" className="h-3 w-3" />
            </>
          }
        >
          {(close) => (
            <ul>
              {annotateTypes.map((annotateTool) => (
                <li key={annotateTool.id} className={annotateTool.id === "draw" ? "group relative" : undefined}>
                  <div className={annotateTool.id === "draw" ? "flex items-center" : undefined}>
                    <button
                      type="button"
                      onClick={() => {
                        handleToolClick(annotateTool.id);
                        close();
                      }}
                      className={`flex-1 ${activeTool === annotateTool.id ? "active" : ""}`}
                    >
                      <ToolIcon name={annotateTool.icon} className="h-4 w-4" />
                      {annotateTool.label}
                    </button>
                    {/* :hover never fires on touch, so the submenu below also needs an
                        explicit tap target to open it — this button is that target. */}
                    {annotateTool.id === "draw" && (
                      <button
                        type="button"
                        onClick={() => setPenSubmenuOpen((current) => !current)}
                        className="btn btn-ghost btn-xs btn-square"
                        aria-label="Pen color and thickness"
                        title="Pen color and thickness"
                      >
                        <ToolIcon name="chevron-down" className="h-3 w-3 -rotate-90" />
                      </button>
                    )}
                  </div>

                  {/* Pen gets its own color/thickness submenu instead of the plain
                      toolbar swatch row other color-tools use — hovering the "Pen"
                      row reveals it on a mouse, and the toggle button above opens
                      it on touch, where :hover never fires. */}
                  {annotateTool.id === "draw" && (
                    <div
                      onPointerDown={(event) => event.stopPropagation()}
                      className={`absolute top-0 left-full z-40 ml-1 w-56 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg ${
                        penSubmenuOpen ? "block" : "hidden group-hover:block"
                      }`}
                    >
                      <p className="mb-1.5 px-1 text-[10px] tracking-wide text-base-content/50 uppercase">Thickness</p>
                      <div className="mb-2 flex items-center gap-1 px-1">
                        <button
                          type="button"
                          onClick={() => setActivePenStrokeWidthPt((w) => Math.max(1, w - 1))}
                          className="btn btn-ghost btn-xs btn-square"
                          aria-label="Decrease pen thickness"
                          title="Decrease pen thickness"
                        >
                          <ToolIcon name="minus" className="h-3 w-3" />
                        </button>
                        <span className="w-5 text-center text-xs tabular-nums text-base-content/70">
                          {activePenStrokeWidthPt}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActivePenStrokeWidthPt((w) => Math.min(20, w + 1))}
                          className="btn btn-ghost btn-xs btn-square"
                          aria-label="Increase pen thickness"
                          title="Increase pen thickness"
                        >
                          <ToolIcon name="plus" className="h-3 w-3" />
                        </button>
                      </div>

                      <p className="mb-1.5 px-1 text-[10px] tracking-wide text-base-content/50 uppercase">Color</p>
                      <div className="flex items-center gap-1.5 px-1">
                        {colorSwatches.map((swatch) => (
                          <button
                            key={swatch.id}
                            type="button"
                            onClick={() => {
                              setActiveColorHex(resolveSwatchHex(swatch.id));
                              handleToolClick("draw");
                              setPenSubmenuOpen(false);
                              close();
                            }}
                            aria-label={`Use ${swatch.id} color`}
                            title={`${swatch.id} (${resolveSwatchHex(swatch.id)})`}
                            className={`h-6 w-6 rounded-full ${swatch.className} ${
                              activeColorHex === resolveSwatchHex(swatch.id)
                                ? "ring-2 ring-base-content/40 ring-offset-2 ring-offset-base-100"
                                : ""
                            }`}
                          />
                        ))}
                        <label
                          className="relative flex h-6 w-6 items-center justify-center rounded-full border border-base-300"
                          style={{ background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" }}
                          title="Custom color"
                          aria-label="Choose a custom color"
                        >
                          <NativeColorInput
                            value={activeColorHex}
                            onChange={(color) => {
                              setActiveColorHex(color);
                              handleToolClick("draw");
                            }}
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ToolbarDropdown>

        <ToolbarDropdown
          triggerClassName={`btn btn-sm gap-1.5 ${activeTool === "shapes" ? "btn-primary" : "btn-ghost"}`}
          menuClassName="w-44"
          trigger={
            <>
              <ToolIcon name="shapes" className="h-4 w-4" />
              Shapes
              <ToolIcon name="chevron-down" className="h-3 w-3" />
            </>
          }
        >
          {(close) => (
            <ul>
              {shapeTypes.map((shape) => (
                <li key={shape.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTool("shapes");
                      setShapeType(shape.id);
                      close();
                    }}
                    className={activeTool === "shapes" && shapeType === shape.id ? "active" : ""}
                  >
                    <ToolIcon name={shape.icon} className="h-4 w-4" />
                    {shape.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ToolbarDropdown>

        <button
          type="button"
          onClick={() => handleToolClick("erase")}
          className={`btn btn-sm gap-1.5 ${activeTool === "erase" ? "btn-primary" : "btn-ghost"}`}
        >
          <ToolIcon name="eraser" className="h-4 w-4" />
          Erase
        </button>

        <div className="ml-1 flex items-center gap-1 border-l border-base-300 pl-2">
          <button
            type="button"
            onClick={undo}
            disabled={past.length === 0}
            className="btn btn-ghost btn-sm gap-1.5"
            aria-label="Undo"
          >
            <ToolIcon name="undo" className="h-4 w-4" />
            Undo
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={future.length === 0}
            className="btn btn-ghost btn-xs btn-square"
            aria-label="Redo"
          >
            <ToolIcon name="redo" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={openFindReplace}
            className={`btn btn-xs btn-square ${showFindReplace ? "btn-primary" : "btn-ghost"}`}
            aria-label="Find and replace"
            title="Find and replace"
          >
            <ToolIcon name="search" className="h-4 w-4" />
          </button>
        </div>

        {/* Text has no size/color controls here at all, even before a box is
            placed — the floating TextEditToolbar that appears the moment you
            click into a text box (new or existing) already covers size,
            color, font, bold/italic, so this bar showing the same thing too
            was a pure duplicate. New text just starts at a fixed default and
            gets adjusted there. */}
        {toolsWithColor.has(activeTool) && (
          <div className="flex items-center gap-1.5 border-l border-base-300 pl-2">
            {colorSwatches.map((swatch) => (
              <button
                key={swatch.id}
                type="button"
                onClick={() => setActiveColorHex(resolveSwatchHex(swatch.id))}
                aria-label={`Use ${swatch.id} color`}
                className={`h-5 w-5 rounded-full ${swatch.className} ${
                  activeColorHex === resolveSwatchHex(swatch.id) ? "ring-2 ring-base-content/40 ring-offset-2 ring-offset-base-100" : ""
                }`}
              />
            ))}
            <label
              className="relative flex h-5 w-5 items-center justify-center rounded-full border border-base-300"
              style={{
                background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
                boxShadow: !colorSwatches.some((s) => resolveSwatchHex(s.id) === activeColorHex)
                  ? "0 0 0 2px var(--color-base-content)"
                  : undefined,
              }}
              title="Custom color"
              aria-label="Choose a custom color"
            >
              <NativeColorInput
                value={activeColorHex}
                onChange={setActiveColorHex}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
          </div>
        )}

        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={handleImageSelected}
        />
      </div>

      {pageCount > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 border-b border-base-300 py-2 text-sm text-base-content/70">
          {pageCount > 1 ? (
            <>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="btn btn-ghost btn-xs btn-square"
                aria-label="Previous page"
              >
                <ToolIcon name="chevron-down" className="h-3.5 w-3.5 rotate-90" />
              </button>
              <span>
                Page {currentPage + 1} of {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={currentPage === pageCount - 1}
                className="btn btn-ghost btn-xs btn-square"
                aria-label="Next page"
              >
                <ToolIcon name="chevron-down" className="h-3.5 w-3.5 -rotate-90" />
              </button>
            </>
          ) : (
            <span>Page 1 of 1</span>
          )}

          <span className="mx-1 h-4 w-px bg-base-300" />

          <button
            type="button"
            onClick={() => setZoomPercent((z) => Math.max(50, z - 10))}
            className="btn btn-ghost btn-xs btn-square"
            aria-label="Zoom out"
          >
            <ToolIcon name="zoom-out" className="h-3.5 w-3.5" />
          </button>
          <span className="w-10 text-center text-xs">{zoomPercent}%</span>
          <button
            type="button"
            onClick={() => setZoomPercent((z) => Math.min(200, z + 10))}
            className="btn btn-ghost btn-xs btn-square"
            aria-label="Zoom in"
          >
            <ToolIcon name="zoom-in" className="h-3.5 w-3.5" />
          </button>

          <span className="mx-1 h-4 w-px bg-base-300" />

          <button
            type="button"
            onClick={() => rotateCurrentPage(-90)}
            disabled={pageOpBusy}
            className="btn btn-ghost btn-xs btn-square"
            aria-label="Rotate page left"
            title="Rotate left"
          >
            <ToolIcon name="rotate-left" className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => rotateCurrentPage(90)}
            disabled={pageOpBusy}
            className="btn btn-ghost btn-xs btn-square"
            aria-label="Rotate page right"
            title="Rotate right"
          >
            <ToolIcon name="rotate-right" className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={deleteCurrentPage}
            disabled={pageOpBusy || pageCount <= 1}
            className="btn btn-ghost btn-xs btn-square text-error"
            aria-label="Delete this page"
            title="Delete this page"
          >
            <ToolIcon name="trash" className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={insertPageAfterCurrent}
            disabled={pageOpBusy}
            className="btn btn-ghost btn-xs gap-1.5"
            title="Insert a blank page after this one"
          >
            <ToolIcon name="plus-page" className="h-3.5 w-3.5" />
            Insert page here
          </button>
        </div>
      )}
      </div>
      {toolbarPinned && <div style={{ height: toolbarHeight }} />}

      {/* Floating Save button — the filename bar's own Save button has scrolled
          out of view by the time the toolbar above is pinned, so this takes over
          as the visible way to save. Always mounted (not conditionally rendered)
          so the opacity/translate change actually transitions instead of popping. */}
      <div
        className={`pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center transition-all duration-300 ${
          toolbarPinned ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        {status === "done" && downloadUrl ? (
          <a
            href={downloadUrl}
            download={file?.name ?? "edited.pdf"}
            className={`btn btn-primary shadow-lg ${toolbarPinned ? "pointer-events-auto" : ""}`}
          >
            <ToolIcon name="download" className="h-4 w-4" />
            Download
          </a>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            disabled={status === "saving"}
            className={`btn btn-primary shadow-lg ${toolbarPinned ? "pointer-events-auto" : ""}`}
          >
            {status === "saving" ? "Saving..." : "Save PDF"}
          </button>
        )}
      </div>

      <div
        ref={scrollContainerRef}
        className="overflow-x-auto rounded-b-2xl bg-base-200 p-3 sm:p-6"
        // No fixed/viewport-relative height here on purpose: the container just
        // grows to fit the rendered page (which is already scaled to the
        // available width), so viewing a page never needs its own separate
        // internal scrollbar — the browser's normal page scroll is all that's
        // needed. Horizontal scroll stays available for when zooming in past
        // 100% makes the page wider than the workspace.
        style={{ minHeight: 420, scrollbarGutter: "stable" }}
      >
        {activeTool === "cursor" && (
          <p className="sticky top-0 z-20 mb-2 -mt-2 bg-base-200/95 py-2 text-center text-xs text-base-content/50 backdrop-blur-sm">
            Click any text on the page to edit it in place — drag empty space to pan around.
          </p>
        )}

        <div className="flex justify-center">
            <div className="relative shadow-xl" style={{ width: canvasWidth, height: canvasHeight }}>
              <canvas ref={canvasRef} className="absolute inset-0" />

              <svg className="pointer-events-none absolute inset-0" width={canvasWidth} height={canvasHeight}>
                {pageElements
                  .filter((el) => el.type === "path")
                  .map((el) => (
                    <g key={el.id}>
                      <polyline
                        points={el.points.map((p) => `${p.x * scale},${p.y * scale}`).join(" ")}
                        fill="none"
                        stroke={el.color}
                        strokeWidth={el.strokeWidthPt * scale}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {activeTool === "erase" && (
                        // A thin drawn line (often ~2px) is nearly impossible to click
                        // precisely — this invisible, much wider duplicate is the real
                        // erase hit target, stacked on top of the visible stroke.
                        <polyline
                          points={el.points.map((p) => `${p.x * scale},${p.y * scale}`).join(" ")}
                          fill="none"
                          stroke="transparent"
                          strokeWidth={16}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ pointerEvents: "stroke", cursor: "not-allowed", touchAction: "none" }}
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            removeElement(el.id);
                          }}
                        />
                      )}
                    </g>
                  ))}
                {drawingPath && (
                  <polyline
                    points={drawingPath.map((p) => `${p.x * scale},${p.y * scale}`).join(" ")}
                    fill="none"
                    stroke={activeColorHex}
                    strokeWidth={activePenStrokeWidthPt * scale}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                {pageElements
                  .filter((el) => el.type === "line" || el.type === "arrow")
                  .map((el) => (
                    <g key={el.id}>
                      <line
                        x1={el.x1Pt * scale}
                        y1={el.y1Pt * scale}
                        x2={el.x2Pt * scale}
                        y2={el.y2Pt * scale}
                        stroke={el.color}
                        strokeWidth={el.strokeWidthPt * scale}
                        strokeLinecap="round"
                      />
                      {el.type === "arrow" &&
                        arrowHeadWings(
                          el.x1Pt * scale,
                          el.y1Pt * scale,
                          el.x2Pt * scale,
                          el.y2Pt * scale,
                          Math.max(8, el.strokeWidthPt * scale * 4)
                        ).map(([wx, wy], i) => (
                          <line
                            key={i}
                            x1={el.x2Pt * scale}
                            y1={el.y2Pt * scale}
                            x2={wx}
                            y2={wy}
                            stroke={el.color}
                            strokeWidth={el.strokeWidthPt * scale}
                            strokeLinecap="round"
                          />
                        ))}
                      {(activeTool === "cursor" || activeTool === "erase") && (
                        <line
                          x1={el.x1Pt * scale}
                          y1={el.y1Pt * scale}
                          x2={el.x2Pt * scale}
                          y2={el.y2Pt * scale}
                          stroke="transparent"
                          strokeWidth={16}
                          strokeLinecap="round"
                          style={{
                            pointerEvents: "stroke",
                            cursor: activeTool === "erase" ? "not-allowed" : "move",
                            touchAction: "none",
                          }}
                          onPointerDown={(event) => startLineDrag(el, event)}
                        />
                      )}
                    </g>
                  ))}
                {lineDraft && (
                  <>
                    <line
                      x1={lineDraft.start.x * scale}
                      y1={lineDraft.start.y * scale}
                      x2={lineDraft.current.x * scale}
                      y2={lineDraft.current.y * scale}
                      stroke={activeColorHex}
                      strokeWidth={2 * scale}
                      strokeLinecap="round"
                    />
                    {shapeType === "arrow" &&
                      arrowHeadWings(
                        lineDraft.start.x * scale,
                        lineDraft.start.y * scale,
                        lineDraft.current.x * scale,
                        lineDraft.current.y * scale,
                        Math.max(8, 2 * scale * 4)
                      ).map(([wx, wy], i) => (
                        <line
                          key={i}
                          x1={lineDraft.current.x * scale}
                          y1={lineDraft.current.y * scale}
                          x2={wx}
                          y2={wy}
                          stroke={activeColorHex}
                          strokeWidth={2 * scale}
                          strokeLinecap="round"
                        />
                      ))}
                  </>
                )}
              </svg>

              {whiteoutDraft && (
                <div
                  className="pointer-events-none absolute z-10 border border-dashed border-base-content/30 bg-white"
                  style={{
                    left: Math.min(whiteoutDraft.start.x, whiteoutDraft.current.x) * scale,
                    top: Math.min(whiteoutDraft.start.y, whiteoutDraft.current.y) * scale,
                    width: Math.abs(whiteoutDraft.current.x - whiteoutDraft.start.x) * scale,
                    height: Math.abs(whiteoutDraft.current.y - whiteoutDraft.start.y) * scale,
                  }}
                />
              )}

              <div
                ref={overlayRef}
                className="absolute inset-0"
                style={{
                  cursor: activeTool === "cursor" ? (isPanning ? "grabbing" : "grab") : "crosshair",
                  // Let clicks fall through empty space to the path/line strokes in the
                  // SVG layer below when erasing — otherwise this div (painted on top)
                  // always wins the hit-test first. Element wrappers below opt back in
                  // with pointerEvents: "auto" so they stay erasable too.
                  pointerEvents: activeTool === "erase" ? "none" : undefined,
                  // Without this, a touch-drag here (panning, drawing, dragging an
                  // element) also triggers the browser's own scroll/zoom gesture,
                  // fighting the manual scrollLeft/scrollTop and point tracking below.
                  touchAction: "none",
                }}
                onPointerDown={handleOverlayPointerDown}
                onPointerMove={handleOverlayPointerMove}
                onPointerUp={handleOverlayPointerUp}
              >
                {pageElements
                  .filter((el) => el.type === "text-edit")
                  .map((el) => {
                    // Same delta-based growth as the save-time mask (see
                    // handleSave) — comparing the replacement's CSS-measured
                    // width against the *original* text's CSS-measured width,
                    // not against originalWidthPt directly, so the mask only
                    // grows because of an actual edit, not because this CSS
                    // substitute font simply renders the unedited original
                    // wider than its true (possibly embedded) PDF font did.
                    const family = el.fontFamily as FontFamilyGuess;
                    const currentTextWidthPt = measureTextWidthPt(el.text, el.fontSizePt, family, el.isBold);
                    const originalTextWidthPt = measureTextWidthPt(el.originalText, el.fontSizePt, family, el.isBold);
                    const maskWidthPt = el.originalWidthPt + Math.max(0, currentTextWidthPt - originalTextWidthPt);
                    const hPad = 1.5;
                    // Vertical padding scales with font size rather than staying a flat
                    // 1.5pt — that fixed amount is fine slack at small sizes but barely
                    // anything at large ones, and ASCENT_RATIO is one fixed guess applied
                    // to every font. Whenever a font's real ascent/descent split runs even
                    // slightly past that guess, a sliver of the original glyphs (usually
                    // descenders) shows past the mask's bottom edge — worse the bigger the
                    // text is, which is exactly the pattern reported.
                    const vPad = Math.max(1.5, el.fontSizePt * 0.15);
                    return (
                    // The outer wrapper stays sized to el.widthPt — that's what
                    // gives the textarea inside enough room to render without
                    // clipping (see buildTextEditElement). The background color
                    // itself lives on a separate, independently-sized inner div
                    // (maskWidthPt) so shrinking the visible mask back down to
                    // the true original width doesn't also shrink the textarea
                    // and reintroduce the clipping this was fixed for.
                    <div
                      key={el.id}
                      className="group absolute"
                      style={{
                        left: el.xPt * scale - hPad * scale,
                        top: el.topPt * scale - vPad * scale,
                        width: el.widthPt * scale + hPad * 2 * scale,
                        height: el.heightPt * scale + vPad * 2 * scale,
                        pointerEvents: "auto",
                      }}
                    >
                      <div
                        className="absolute inset-y-0 left-0"
                        style={{ width: maskWidthPt * scale + hPad * 2 * scale, backgroundColor: el.bgColorHex }}
                      />
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeElement(el.id);
                        }}
                        className="absolute -right-2 -top-2 z-10 hidden h-5 w-5 items-center justify-center rounded-full bg-error text-white group-hover:flex"
                        aria-label="Revert to original text"
                      >
                        <ToolIcon name="close" className="h-3 w-3" />
                      </button>
                      <textarea
                        value={el.text}
                        onChange={(event) => {
                          const newText = event.target.value;
                          // Grow the box to fit a longer replacement (so the end of the
                          // text doesn't scroll out of view under overflow-x-hidden below),
                          // but never below the original detected width — shrinks back
                          // down once the text is short again instead of staying stuck wide.
                          const measuredWidthPt = measureTextWidthPt(
                            newText,
                            el.fontSizePt,
                            el.fontFamily as FontFamilyGuess,
                            el.isBold,
                          );
                          updateElement(el.id, {
                            text: newText,
                            widthPt: Math.max(el.originalWidthPt, measuredWidthPt),
                          });
                        }}
                        onFocus={() => {
                          pushHistory();
                          setSelectedElementId(el.id);
                        }}
                        onPointerDown={(event) => event.stopPropagation()}
                        wrap="off"
                        // Text-edit replacements stay on one line at a fixed position, matching
                        // the original. Wrapping would push overflow onto a second line and,
                        // with the box's fixed height, auto-scroll to hide the first line —
                        // the browser's UI font also just renders wider than most PDF fonts at
                        // the same size, so even same-length replacements can trigger this.
                        // overflow-hidden (not just -x) — the box's height is derived from
                        // pdf.js's tight glyph-metrics measurement, but the browser's own
                        // line-height for the same font-size can run a couple pixels taller,
                        // which was enough to trigger the textarea's native vertical
                        // scrollbar even though nothing meaningful was actually clipped.
                        // relative — without a position, this in-flow textarea painted
                        // *behind* the absolutely-positioned mask div added just above it
                        // (per CSS stacking order, positioned elements paint above in-flow
                        // ones regardless of DOM order), hiding the text entirely even
                        // though it was still there and still editable.
                        className="relative h-full w-full resize-none overflow-hidden whitespace-pre border border-dashed border-transparent bg-transparent leading-none outline-none hover:border-base-content/20"
                        style={{
                          color: el.color,
                          fontSize: el.fontSizePt * scale,
                          fontWeight: el.isBold ? "bold" : "normal",
                          fontStyle: el.isItalic ? "italic" : "normal",
                          fontFamily:
                            el.fontFamily === "serif"
                              ? "Georgia, 'Times New Roman', serif"
                              : el.fontFamily === "monospace"
                                ? "'Courier New', monospace"
                                : "Helvetica, Arial, sans-serif",
                        }}
                      />
                    </div>
                    );
                  })}

                {pageElements
                  .filter((el) => el.type !== "path" && el.type !== "text-edit" && el.type !== "line" && el.type !== "arrow")
                  .map((el) => (
                    <div
                      key={el.id}
                      onPointerDown={(event) => {
                        setSelectedElementId(el.id);
                        startElementDrag(el, event);
                      }}
                      // outline (not border) so the selection indicator never
                      // shifts the box's own content by a pixel — it draws
                      // outside the box entirely. This thin line is also all
                      // that's left to grab for resizing now that the old
                      // filled-square handles are gone.
                      className={`group absolute ${
                        el.id === selectedElementId ? "outline-1 outline-primary outline-offset-2" : ""
                      }`}
                      style={{
                        left: el.xPt * scale,
                        top: el.yPt * scale,
                        width: el.widthPt * scale,
                        height: el.type === "text" ? undefined : el.heightPt * scale,
                        cursor: activeTool === "erase" ? "not-allowed" : "move",
                        pointerEvents: "auto",
                        touchAction: "none",
                      }}
                    >
                      {el.type !== "form-text" && el.type !== "text" && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeElement(el.id);
                          }}
                          // z-20, one above the resize handles below — this button and the
                          // "ne" corner handle sit in the same top-right corner, and with
                          // matching z-index the one later in the DOM (the handle) was
                          // winning every overlapping click, so Delete never fired there.
                          className="absolute -right-2 -top-2 z-20 hidden h-5 w-5 items-center justify-center rounded-full bg-error text-white group-hover:flex"
                          aria-label="Delete"
                        >
                          <ToolIcon name="close" className="h-3 w-3" />
                        </button>
                      )}

                      {el.type === "text" && (
                        <textarea
                          // rows={1} pins the textarea to exactly one line's height, so
                          // once the text wraps (or a newline is typed) the *fixed* box no
                          // longer fits its own content and the browser's default
                          // overflow:auto kicks in as a scrollbar instead of the box
                          // growing. A plain callback ref re-runs on every render (a new
                          // inline function is a new ref identity, so React detaches and
                          // re-attaches it each time) — cheaper than wiring a per-element
                          // useEffect just to resync height after every text/font-size
                          // change, and this needs to happen after every one of them.
                          ref={(node) => {
                            if (!node) return;
                            node.style.height = "auto";
                            node.style.height = `${node.scrollHeight}px`;
                          }}
                          value={el.text}
                          onChange={(event) => {
                            const newText = event.target.value;
                            // Grows the box to fit whatever line is currently longest,
                            // instead of wrapping at a fixed width — wrap="off" below stops
                            // the browser from breaking lines on its own, so the only way to
                            // get a second line is an actual Enter keypress, not running out
                            // of horizontal room.
                            const family = el.fontFamily as FontFamilyGuess;
                            const widestLinePt = newText
                              .split("\n")
                              .reduce((max, line) => Math.max(max, measureTextWidthPt(line, el.fontSizePt, family, el.isBold)), 0);
                            updateElement(el.id, { text: newText, widthPt: Math.max(20, widestLinePt + 8) });
                            event.target.style.height = "auto";
                            event.target.style.height = `${event.target.scrollHeight}px`;
                          }}
                          onFocus={() => {
                            pushHistory();
                            setSelectedElementId(el.id);
                          }}
                          onPointerDown={(event) => {
                            // A plain click should still land the caret for typing, but
                            // pressing and dragging (anywhere on the box, not just its
                            // edge) should move it — matching how Canva/Slides-style
                            // editors treat text boxes. Distinguish the two with a small
                            // movement threshold before handing off to the drag logic.
                            event.stopPropagation();
                            const textarea = event.currentTarget;
                            const startX = event.clientX;
                            const startY = event.clientY;
                            let dragging = false;

                            function onMove(moveEvent: PointerEvent) {
                              if (dragging) return;
                              if (Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) > 4) {
                                dragging = true;
                                window.removeEventListener("pointermove", onMove);
                                window.removeEventListener("pointerup", onUp);
                                textarea.blur();
                                startElementDrag(el, event);
                              }
                            }
                            function onUp() {
                              window.removeEventListener("pointermove", onMove);
                              window.removeEventListener("pointerup", onUp);
                            }
                            window.addEventListener("pointermove", onMove);
                            window.addEventListener("pointerup", onUp);
                          }}
                          // A plain <textarea> defaults to rows="2" when no rows prop is
                          // given — for one line of text that left a whole second blank
                          // line's worth of box below it. rows={1} plus this minHeight is
                          // the actual single-line height; the box only grows taller than
                          // that once the text truly wraps or a newline is typed.
                          rows={1}
                          // wrap="off" + whitespace-pre stop the browser from breaking a
                          // line just because it hit the box's edge — the box is always
                          // grown to fit the longest line instead (see onChange above), so
                          // the only way text moves to a new line is an actual Enter.
                          wrap="off"
                          className="w-full cursor-move resize-none overflow-hidden border border-dashed border-transparent bg-transparent whitespace-pre leading-tight outline-none hover:border-base-content/20 focus:cursor-text"
                          style={{
                            color: el.color,
                            fontSize: el.fontSizePt * scale,
                            minHeight: el.fontSizePt * scale * 1.4,
                            fontWeight: el.isBold ? "bold" : "normal",
                            fontStyle: el.isItalic ? "italic" : "normal",
                            fontFamily:
                              el.fontFamily === "serif"
                                ? "Georgia, 'Times New Roman', serif"
                                : el.fontFamily === "monospace"
                                  ? "'Courier New', monospace"
                                  : "Helvetica, Arial, sans-serif",
                            touchAction: "none",
                          }}
                        />
                      )}

                      {el.type === "rect" && (
                        <div
                          className="h-full w-full"
                          style={{
                            borderStyle: el.strokeWidthPt > 0 ? "solid" : "none",
                            borderWidth: el.strokeWidthPt * scale,
                            borderColor: el.color,
                            backgroundColor: el.fillColorHex ?? "transparent",
                          }}
                        />
                      )}

                      {el.type === "ellipse" && (
                        <div
                          className="h-full w-full rounded-full"
                          style={{
                            borderStyle: el.strokeWidthPt > 0 ? "solid" : "none",
                            borderWidth: el.strokeWidthPt * scale,
                            borderColor: el.color,
                            backgroundColor: el.fillColorHex ?? "transparent",
                          }}
                        />
                      )}

                      {el.type === "highlight" && (
                        <div className="h-full w-full" style={{ backgroundColor: el.color, opacity: 0.35 }} />
                      )}

                      {el.type === "image" && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={el.dataUrl}
                          alt=""
                          className="h-full w-full object-contain"
                          draggable={false}
                          style={{ transform: el.rotationDeg ? `rotate(${el.rotationDeg}deg)` : undefined }}
                        />
                      )}

                      {el.type === "whiteout" && (
                        <div className="h-full w-full border border-dashed border-base-content/30 bg-white" />
                      )}

                      {el.type === "link" && (
                        <div className="flex h-full w-full items-center gap-1 rounded border-2 border-dashed border-info bg-info/10 px-1.5">
                          <ToolIcon name="link" className="h-3.5 w-3.5 shrink-0 text-info" />
                          <input
                            type="text"
                            value={el.url}
                            onChange={(event) => updateElement(el.id, { url: event.target.value })}
                            onFocus={pushHistory}
                            onPointerDown={(event) => event.stopPropagation()}
                            placeholder="https://..."
                            className="min-w-0 flex-1 border-none bg-transparent text-xs text-info outline-none placeholder:text-info/50"
                          />
                        </div>
                      )}

                      {el.type === "form-text" && !el.multiline && (
                        // Border is always visible now (not hover-only) — it previews the
                        // field's real border color, which is baked into the saved PDF too,
                        // same treatment as form-dropdown. Field name, border/font color,
                        // align, size, and required all live in the floating
                        // FormTextEditToolbar that appears when this is selected.
                        <div className="flex h-full w-full items-center rounded px-1.5" style={{ border: `1px solid ${el.borderColor}` }}>
                          <input
                            type="text"
                            value={el.defaultValue}
                            onChange={(event) => updateElement(el.id, { defaultValue: event.target.value })}
                            onFocus={() => {
                              pushHistory();
                              setSelectedElementId(el.id);
                            }}
                            onPointerDown={(event) => event.stopPropagation()}
                            placeholder="Text field"
                            // The typed value's own color is picked per-field from the page's
                            // actual background (see textColor) rather than a fixed Tailwind
                            // class — a dark/colored page needs white text, not black-on-black.
                            className="min-w-0 flex-1 border-none bg-transparent outline-none placeholder:opacity-40"
                            style={{ color: el.textColor, fontSize: el.fontSizePt * scale, textAlign: el.align }}
                          />
                        </div>
                      )}

                      {el.type === "form-text" && el.multiline && (
                        <div className="h-full w-full rounded p-1.5" style={{ border: `1px solid ${el.borderColor}` }}>
                          <textarea
                            value={el.defaultValue}
                            onChange={(event) => updateElement(el.id, { defaultValue: event.target.value })}
                            onFocus={() => {
                              pushHistory();
                              setSelectedElementId(el.id);
                            }}
                            onPointerDown={(event) => event.stopPropagation()}
                            placeholder="Text multiline"
                            className="h-full w-full resize-none border-none bg-transparent outline-none placeholder:opacity-40"
                            style={{ color: el.textColor, fontSize: el.fontSizePt * scale, textAlign: el.align }}
                          />
                        </div>
                      )}

                      {el.type === "form-dropdown" &&
                        (() => {
                          const options = el.optionsText
                            .split("\n")
                            .map((o) => o.trim())
                            .filter(Boolean);
                          return (
                            // Just the real, working preview here — no inline options editor
                            // cluttering the field itself anymore; that's all moved into the
                            // floating DropdownEditToolbar that appears when this is selected
                            // (field name, options, colors, alignment, font size,
                            // multi-select/required), the same way TextEditToolbar handles a
                            // selected text box. The border is always visible (not just on
                            // hover, like the other form fields) — it previews the field's
                            // real border color, which is baked into the saved PDF too.
                            <div
                              className="flex h-full w-full items-center rounded px-1.5"
                              style={{ border: `1px solid ${el.borderColor}` }}
                            >
                              <select
                                value={el.selectedValue && options.includes(el.selectedValue) ? el.selectedValue : ""}
                                onChange={(event) => updateElement(el.id, { selectedValue: event.target.value })}
                                onFocus={() => {
                                  pushHistory();
                                  setSelectedElementId(el.id);
                                }}
                                onPointerDown={(event) => event.stopPropagation()}
                                className="w-full min-w-0 flex-1 border-none bg-transparent outline-none"
                                style={{ color: el.textColor, fontSize: el.fontSizePt * scale, textAlign: el.align }}
                              >
                                <option value="" disabled>
                                  {options.length > 0 ? "Choose default..." : "No options yet"}
                                </option>
                                {options.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        })()}

                      {el.type === "form-radio" && (
                        // A real, clickable radio dot — editing the group name/option
                        // label/colors moved to the floating RadioEditToolbar (same
                        // reasoning as form-text/dropdown: cramming text inputs into an
                        // already-tiny 20x20 box never worked well). Picking this one
                        // clears "selected" on every other option sharing its group name,
                        // mirroring how a real radio group behaves.
                        <button
                          type="button"
                          onClick={() => selectRadioOption(el)}
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            setSelectedElementId(el.id);
                          }}
                          title={el.optionLabel || "Radio option"}
                          className="flex h-full w-full items-center justify-center rounded-full"
                          style={{ border: `1px solid ${el.borderColor}` }}
                        >
                          {el.selectedByDefault && (
                            <span className="h-1/2 w-1/2 rounded-full" style={{ backgroundColor: el.textColor }} />
                          )}
                        </button>
                      )}

                      {el.type === "form-checkbox" && (
                        <button
                          type="button"
                          onClick={() => {
                            pushHistory();
                            updateElement(el.id, { checked: !el.checked });
                          }}
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            setSelectedElementId(el.id);
                          }}
                          title={el.fieldName}
                          className="flex h-full w-full items-center justify-center rounded"
                          style={{ border: `1px solid ${el.borderColor}` }}
                        >
                          {el.checked && (
                            <span className="h-3/4 w-3/4" style={{ color: el.textColor }}>
                              <ToolIcon name="check" className="h-full w-full" />
                            </span>
                          )}
                        </button>
                      )}

                      {el.type === "stamp" && (
                        <div className="flex h-full w-full items-center justify-center" style={{ color: el.color }}>
                          <ToolIcon
                            name={el.kind === "x" ? "close" : el.kind === "check" ? "check" : "dot"}
                            className="h-full w-full"
                          />
                        </div>
                      )}

                      {/* Text has no resize handles at all — its size only changes via
                          the floating TextEditToolbar's own control now (dragging on
                          canvas repeatedly flickered/felt wrong no matter how the math
                          was tuned); only drag-to-move is left for it here. Every other
                          element type still gets all 8, drawn as invisible strips right
                          on the selection outline rather than a fat visible square. */}
                      {el.type !== "text" &&
                        RESIZE_HANDLES.map((h) => (
                        <div
                          key={h.dir}
                          onPointerDown={(event) => startElementResize(el, event, h.dir)}
                          title="Drag to resize"
                          style={{ touchAction: "none" }}
                          className={`absolute z-10 ${h.className} ${h.cursor} ${
                            el.id === selectedElementId ? "block" : "hidden group-hover:block"
                          }`}
                        />
                      ))}
                    </div>
                  ))}

              {selectedTextElement && (
                <TextEditToolbar
                  // Keyed by element id so switching the selected text remounts this
                  // toolbar (and its own open-menu state) from scratch instead of
                  // carrying anything over from the previous selection.
                  key={selectedTextElement.id}
                  element={selectedTextElement}
                  topPt={selectedTextTopPt}
                  heightPt={selectedTextHeightPt}
                  scale={scale}
                  onUpdate={(patch) => updateElement(selectedTextElement.id, patch)}
                  onDuplicate={selectedTextElement.type === "text" ? () => duplicateTextElement(selectedTextElement) : undefined}
                  onDelete={() => removeElement(selectedTextElement.id)}
                />
              )}

              {selectedShapeElement && (
                <ShapeEditToolbar
                  key={selectedShapeElement.id}
                  element={selectedShapeElement}
                  scale={scale}
                  onUpdate={(patch) => updateElement(selectedShapeElement.id, patch)}
                  onDuplicate={() => duplicateShapeElement(selectedShapeElement)}
                  onDelete={() => removeElement(selectedShapeElement.id)}
                />
              )}

              {selectedLineElement && (
                <LineEditToolbar
                  key={selectedLineElement.id}
                  element={selectedLineElement}
                  scale={scale}
                  onUpdate={(patch) => updateElement(selectedLineElement.id, patch)}
                  onDuplicate={() => duplicateLineElement(selectedLineElement)}
                  onDelete={() => removeElement(selectedLineElement.id)}
                />
              )}

              {selectedDropdownElement && (
                <DropdownEditToolbar
                  key={selectedDropdownElement.id}
                  element={selectedDropdownElement}
                  topPt={selectedDropdownElement.yPt}
                  heightPt={selectedDropdownElement.heightPt}
                  scale={scale}
                  onUpdate={(patch) => updateElement(selectedDropdownElement.id, patch)}
                  onDuplicate={() => duplicateDropdownElement(selectedDropdownElement)}
                  onDelete={() => removeElement(selectedDropdownElement.id)}
                />
              )}

              {selectedFormTextElement && (
                <FormTextEditToolbar
                  key={selectedFormTextElement.id}
                  element={selectedFormTextElement}
                  topPt={selectedFormTextElement.yPt}
                  heightPt={selectedFormTextElement.heightPt}
                  scale={scale}
                  onUpdate={(patch) => updateElement(selectedFormTextElement.id, patch)}
                  onDuplicate={() => duplicateFormTextElement(selectedFormTextElement)}
                  onDelete={() => clearOrRemoveFormTextElement(selectedFormTextElement)}
                />
              )}

              {selectedImageElement && (
                <ImageEditToolbar
                  key={selectedImageElement.id}
                  element={selectedImageElement}
                  scale={scale}
                  onUpdate={(patch) => updateElement(selectedImageElement.id, patch)}
                  onDuplicate={() => duplicateImageElement(selectedImageElement)}
                  onDelete={() => removeElement(selectedImageElement.id)}
                />
              )}

              {selectedCheckboxElement && (
                <CheckboxEditToolbar
                  key={selectedCheckboxElement.id}
                  element={selectedCheckboxElement}
                  scale={scale}
                  onUpdate={(patch) => updateElement(selectedCheckboxElement.id, patch)}
                  onDuplicate={() => duplicateCheckboxElement(selectedCheckboxElement)}
                  onDelete={() => removeElement(selectedCheckboxElement.id)}
                />
              )}

              {selectedRadioElement && (
                <RadioEditToolbar
                  key={selectedRadioElement.id}
                  element={selectedRadioElement}
                  scale={scale}
                  onUpdate={(patch) => updateElement(selectedRadioElement.id, patch)}
                  onDuplicate={() => duplicateRadioElement(selectedRadioElement)}
                  onDelete={() => removeElement(selectedRadioElement.id)}
                />
              )}
              </div>

              {/* Detected existing PDF text — click to mask & replace in place. Rendered
                  last so it sits above the editing overlay and can still receive clicks. */}
              {activeTool === "cursor" &&
                textItems
                  .filter((item) => !activeItemIndexes.has(item.itemIndex))
                  .map((item) => (
                    <div
                      key={item.itemIndex}
                      onClick={() => activateTextItem(item)}
                      className="absolute cursor-text hover:bg-primary/10 hover:outline-1 hover:outline-primary/40"
                      style={{
                        left: item.xPt * scale,
                        top: item.topPt * scale,
                        width: item.widthPt * scale,
                        height: item.heightPt * scale,
                      }}
                      title="Click to edit this text"
                    />
                  ))}

              {isRendering && (
                <div className="absolute inset-0 flex items-center justify-center bg-base-100/60 text-sm text-base-content/60">
                  Rendering page...
                </div>
              )}
            </div>
          </div>
        </div>
    </div>
  );
}

