"use client";

import { useEffect, useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { UploadSourceMenu } from "./UploadSourceMenu";
import { SaveSuccessModal } from "./SaveSuccessModal";
import { SignaturePad } from "./SignaturePad";
import { LabelEditToolbar, type LabelFontFamily } from "./LabelEditToolbar";
import { FormFieldTextToolbar } from "./FormFieldTextToolbar";
import { SignatureBoxToolbar } from "./SignatureBoxToolbar";
import { loadPdfjs } from "@/lib/pdfjs";
import { hexToRgbFloat, resolveSwatchHex } from "@/lib/colorSwatches";
import { describeError } from "@/lib/errorHelpers";

type Status = "idle" | "working" | "done" | "error";
type FieldType = "text" | "textarea" | "checkbox" | "radio" | "dropdown";
type Align = "left" | "center" | "right";

// Top-left origin (not centered like Fill & Sign's stamps) — a form field's
// position and size are both meaningful, so it's simplest to work in the
// same x/y/width/height shape pdf-lib's addToPage itself expects.
type BaseElement = { id: string; pageIndex: number; xPct: number; yPct: number; widthPct: number; heightPct: number };
type FieldElement = BaseElement & {
  kind: "field";
  type: FieldType;
  name: string;
  // Radio only: elements sharing the same `name` become one mutually-exclusive
  // group, one `optionValue` per button — matching how pdf-lib's RadioGroup works.
  optionValue?: string;
  // Dropdown only: raw comma-separated option list, edited as free text.
  options?: string;
  // text/textarea/dropdown: pre-filled when the PDF is opened.
  defaultValue?: string;
  // text/textarea/dropdown: baked into the field's own appearance, same as
  // Edit PDF's form-field tools (dropdown ignores align — pdf-lib has no
  // alignment control for choice fields, only text fields).
  fontSizePt?: number;
  align?: Align;
  // text/textarea only, baked into the saved widget's own appearance (not
  // just an editor outline) — same as Edit PDF's form-text tool.
  textColor?: string;
  borderColor?: string;
  // All field types.
  required?: boolean;
  // Checkbox only: ticked by default when the PDF is opened.
  checked?: boolean;
  // Radio only: this option is the group's default selection.
  selectedByDefault?: boolean;
};
// A logo/stamp/letterhead placed directly on the page. Not a form field:
// pdf-lib has no native "image field" type in the AcroForm spec.
type ImageElement = BaseElement & { kind: "image"; dataUrl: string; aspectRatio: number };
// A resizable placeholder area you position first, then sign (or leave
// empty as a "sign here" box for a printed copy) — closer to Sejda's own
// Signature box than immediately stamping a drawn signature on click, the
// way Fill & Sign's "Add Signature" does. `dataUrl` is null until signed;
// the signature itself is still just a PNG stamp, not a real cryptographic
// signature field, since pdf-lib can't create one.
type SignatureBoxElement = BaseElement & { kind: "signature"; dataUrl: string | null; borderColor: string };
// Plain static text drawn straight onto the page (pdf-lib's `drawText`) —
// not a fillable field, just an instructional label. Center-anchored like
// Fill & Sign's text stamps rather than top-left, since its box has no fixed
// width/height (it auto-sizes to the typed content).
type LabelElement = {
  id: string;
  pageIndex: number;
  kind: "label";
  xPct: number;
  yPct: number;
  text: string;
  fontSizePt: number;
  isBold: boolean;
  isItalic: boolean;
  fontFamily: LabelFontFamily;
  colorHex: string;
};
type FormElement = FieldElement | ImageElement | LabelElement | SignatureBoxElement;

const LABEL_FONT_CSS: Record<LabelFontFamily, string> = {
  "sans-serif": "Helvetica, Arial, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  monospace: "'Courier New', Courier, monospace",
};

const CONTAINER_PADDING_PX = 32;
const MIN_ZOOM = 50;
const MAX_ZOOM = 200;
const ZOOM_STEP = 10;
const MIN_FONT_SIZE_PT = 6;
const MAX_FONT_SIZE_PT = 36;
// A drag can now start from anywhere on a field's box (not just its grip),
// so a small movement threshold keeps an ordinary click — to type in a text
// field, or tap "Click to sign" — from nudging the element by a stray pixel.
const DRAG_THRESHOLD_PX = 3;

// 8-direction resize (same set Edit PDF uses) — Text Field/Textarea only;
// the other field types keep their original single bottom-right handle.
type ResizeHandleDir = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
const RESIZE_HANDLES: { dir: ResizeHandleDir; className: string; cursor: string }[] = [
  { dir: "nw", className: "-top-1 -left-1", cursor: "cursor-nwse-resize" },
  { dir: "n", className: "-top-1 left-1/2 -translate-x-1/2", cursor: "cursor-ns-resize" },
  { dir: "ne", className: "-top-1 -right-1", cursor: "cursor-nesw-resize" },
  { dir: "e", className: "top-1/2 -right-1 -translate-y-1/2", cursor: "cursor-ew-resize" },
  { dir: "se", className: "-right-1 -bottom-1", cursor: "cursor-nwse-resize" },
  { dir: "s", className: "-bottom-1 left-1/2 -translate-x-1/2", cursor: "cursor-ns-resize" },
  { dir: "sw", className: "-bottom-1 -left-1", cursor: "cursor-nesw-resize" },
  { dir: "w", className: "top-1/2 -left-1 -translate-y-1/2", cursor: "cursor-ew-resize" },
];

const DEFAULT_SIZE: Record<FieldType, { widthPct: number; heightPct: number }> = {
  text: { widthPct: 0.28, heightPct: 0.035 },
  textarea: { widthPct: 0.32, heightPct: 0.1 },
  checkbox: { widthPct: 0.03, heightPct: 0.03 },
  radio: { widthPct: 0.03, heightPct: 0.03 },
  dropdown: { widthPct: 0.28, heightPct: 0.035 },
};
const FIELD_LABELS: Record<FieldType, string> = {
  text: "Text Field",
  textarea: "Textarea",
  checkbox: "Checkbox",
  radio: "Radio Button",
  dropdown: "Dropdown",
};
const FIELD_ICONS: Record<FieldType, string> = {
  text: "cursor",
  textarea: "text-multiline",
  checkbox: "checkbox",
  radio: "radio-button",
  dropdown: "dropdown-list",
};
const ALIGN_OPTIONS: { value: Align; icon: string; label: string }[] = [
  { value: "left", icon: "align-left", label: "Align left" },
  { value: "center", icon: "align-center", label: "Align center" },
  { value: "right", icon: "align-right", label: "Align right" },
];

const STAGGER_STEPS = [
  { x: 0.1, y: 0.1 },
  { x: 0.1, y: 0.25 },
  { x: 0.1, y: 0.4 },
  { x: 0.1, y: 0.55 },
  { x: 0.1, y: 0.7 },
];

function createId() {
  return `field-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function CreateFormsWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pageSizePt, setPageSizePt] = useState<{ width: number; height: number } | null>(null);
  const [containerWidth, setContainerWidth] = useState(700);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [elements, setElements] = useState<FormElement[]>([]);
  const [addCount, setAddCount] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  // Which signature box the pad is currently drawing into — set right
  // before opening the pad, consumed (and cleared) in handleSignatureConfirm.
  const [signingElementId, setSigningElementId] = useState<string | null>(null);
  // Drawing a signature is the slow part — cache it so signing another box
  // after the first time just stamps the same drawing instead of reopening
  // the pad (still overridable per-box via "Re-sign").
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  function resetOutput() {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setStatus("idle");
    setErrorMessage("");
    setShowSuccessModal(false);
  }

  async function loadFile(selected: File) {
    resetOutput();
    setFile(selected);
    setPageCount(null);
    setCurrentPageIndex(0);
    setElements([]);
    setAddCount(0);
    setZoomPercent(100);
    try {
      const pdfjs = await loadPdfjs();
      const doc = await pdfjs.getDocument({ data: await selected.arrayBuffer() }).promise;
      setPageCount(doc.numPages);
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, "Couldn't read this file — make sure it's a valid PDF."));
    }
  }

  // Tracks the scroll container's own width so the page can be fit to it
  // (like PdfEditorWorkspace / Fill & Sign) instead of a small fixed size.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setContainerWidth(Math.round(entry.contentRect.width / 8) * 8);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [file]);

  useEffect(() => {
    if (!file || !pageCount) return;
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await loadPdfjs();
        const bytes = await file.arrayBuffer();
        const doc = await pdfjs.getDocument({ data: bytes }).promise;
        const pageNumber = Math.min(Math.max(currentPageIndex + 1, 1), doc.numPages);
        const page = await doc.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const availableWidth = Math.max(240, containerWidth - CONTAINER_PADDING_PX);
        const fitScale = availableWidth / baseViewport.width;
        const renderScale = fitScale * (zoomPercent / 100);
        const viewport = page.getViewport({ scale: renderScale });
        const canvas = previewCanvasRef.current;
        if (!canvas || cancelled) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        if (cancelled) return;
        setPageSizePt({ width: baseViewport.width, height: baseViewport.height });
      } catch {
        // Preview render failed — fields can still be added by field-name/position.
        if (!cancelled) setPageSizePt(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, pageCount, currentPageIndex, containerWidth, zoomPercent]);

  const currentPageElements = elements.filter((el) => el.pageIndex === currentPageIndex);
  const typeCounts: Record<FieldType, number> = { text: 0, textarea: 0, checkbox: 0, radio: 0, dropdown: 0 };
  elements.forEach((el) => {
    if (el.kind === "field") typeCounts[el.type]++;
  });
  const previewScale = (() => {
    if (!pageSizePt) return 1;
    const availableWidth = Math.max(240, containerWidth - CONTAINER_PADDING_PX);
    return (availableWidth / pageSizePt.width) * (zoomPercent / 100);
  })();

  function nextStagger() {
    const spot = STAGGER_STEPS[addCount % STAGGER_STEPS.length];
    setAddCount((c) => c + 1);
    return spot;
  }

  function addField(type: FieldType) {
    const spot = nextStagger();
    const id = createId();
    const size = DEFAULT_SIZE[type];
    const n = typeCounts[type] + 1;
    const takesTextStyle = type === "text" || type === "textarea" || type === "dropdown";
    const isTextLike = type === "text" || type === "textarea";
    setElements((prev) => [
      ...prev,
      {
        kind: "field",
        id,
        pageIndex: currentPageIndex,
        type,
        name: type === "radio" ? `radio_group_${n}` : `${type}_${n}`,
        optionValue: type === "radio" ? "Option 1" : undefined,
        options: type === "dropdown" ? "Option 1, Option 2, Option 3" : undefined,
        defaultValue: "",
        fontSizePt: takesTextStyle ? 12 : undefined,
        align: takesTextStyle ? "left" : undefined,
        textColor: isTextLike ? "#000000" : undefined,
        borderColor: isTextLike ? resolveSwatchHex("primary") : undefined,
        required: false,
        checked: type === "checkbox" ? false : undefined,
        selectedByDefault: type === "radio" ? false : undefined,
        xPct: spot.x,
        yPct: spot.y,
        widthPct: size.widthPct,
        heightPct: size.heightPct,
      },
    ]);
    if (isTextLike) setSelectedElementId(id);
    resetOutput();
  }

  function duplicateField(id: string) {
    setElements((prev) => {
      const original = prev.find((item) => item.id === id && item.kind === "field") as FieldElement | undefined;
      if (!original) return prev;
      const copy: FieldElement = {
        ...original,
        id: createId(),
        xPct: Math.min(1 - original.widthPct, original.xPct + 0.03),
        yPct: Math.min(1 - original.heightPct, original.yPct + 0.03),
      };
      return [...prev, copy];
    });
    resetOutput();
  }

  function addLabel() {
    const spot = nextStagger();
    const id = createId();
    setElements((prev) => [
      ...prev,
      {
        kind: "label",
        id,
        pageIndex: currentPageIndex,
        xPct: spot.x,
        yPct: spot.y,
        text: "Type your text",
        fontSizePt: 20,
        isBold: false,
        isItalic: false,
        fontFamily: "sans-serif",
        colorHex: "#000000",
      },
    ]);
    setSelectedElementId(id);
    resetOutput();
  }

  function duplicateLabel(id: string) {
    setElements((prev) => {
      const original = prev.find((item) => item.id === id && item.kind === "label") as LabelElement | undefined;
      if (!original) return prev;
      const copy: LabelElement = { ...original, id: createId(), xPct: Math.min(0.9, original.xPct + 0.03), yPct: Math.min(0.9, original.yPct + 0.03) };
      return [...prev, copy];
    });
    resetOutput();
  }

  // Labels are center-anchored (like Fill & Sign's stamps), not top-left like
  // form fields, so they get their own simpler drag handler with no
  // width/height clamping — the box has no fixed size to clamp against.
  // Draggable from the whole label (not just the toolbar's move handle), so
  // a small movement threshold keeps an ordinary click-to-position-the-
  // cursor-in-the-text-box from nudging it — only a real drag moves it.
  function startLabelDrag(id: string, event: React.PointerEvent) {
    event.stopPropagation();
    const box = previewBoxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    let hasMoved = false;

    function onMove(moveEvent: PointerEvent) {
      if (!hasMoved) {
        if (Math.abs(moveEvent.clientX - startX) < DRAG_THRESHOLD_PX && Math.abs(moveEvent.clientY - startY) < DRAG_THRESHOLD_PX) {
          return;
        }
        hasMoved = true;
      }
      const x = (moveEvent.clientX - rect.left) / rect.width;
      const y = (moveEvent.clientY - rect.top) / rect.height;
      updateElement(id, { xPct: Math.min(1, Math.max(0, x)), yPct: Math.min(1, Math.max(0, y)) });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function placeImage(dataUrl: string) {
    const img = new window.Image();
    img.onload = () => {
      const spot = nextStagger();
      const id = createId();
      const aspectRatio = img.naturalHeight / img.naturalWidth || 0.5;
      const widthPct = 0.25;
      const heightPct = pageSizePt
        ? Math.min(0.6, (widthPct * pageSizePt.width * aspectRatio) / pageSizePt.height)
        : 0.15;
      setElements((prev) => [
        ...prev,
        { kind: "image", id, pageIndex: currentPageIndex, dataUrl, aspectRatio, xPct: spot.x, yPct: spot.y, widthPct, heightPct },
      ]);
      resetOutput();
    };
    img.src = dataUrl;
  }

  function addImageFile(selected: File) {
    const reader = new FileReader();
    reader.onload = () => placeImage(String(reader.result));
    reader.readAsDataURL(selected);
  }

  function addSignatureBox() {
    const spot = nextStagger();
    const id = createId();
    setElements((prev) => [
      ...prev,
      {
        kind: "signature",
        id,
        pageIndex: currentPageIndex,
        xPct: spot.x,
        yPct: spot.y,
        widthPct: 0.32,
        heightPct: 0.1,
        dataUrl: null,
        borderColor: resolveSwatchHex("primary"),
      },
    ]);
    setSelectedElementId(id);
    resetOutput();
  }

  function duplicateSignatureBox(id: string) {
    setElements((prev) => {
      const original = prev.find((item) => item.id === id && item.kind === "signature") as SignatureBoxElement | undefined;
      if (!original) return prev;
      const copy: SignatureBoxElement = {
        ...original,
        id: createId(),
        xPct: Math.min(1 - original.widthPct, original.xPct + 0.03),
        yPct: Math.min(1 - original.heightPct, original.yPct + 0.03),
      };
      return [...prev, copy];
    });
    resetOutput();
  }

  // Reuses the cached drawing if one already exists — resignAt below always
  // reopens the pad instead, for a deliberate "Re-sign".
  function signAt(id: string) {
    if (savedSignature) {
      updateElement(id, { dataUrl: savedSignature });
    } else {
      setSigningElementId(id);
      setShowSignaturePad(true);
    }
  }

  function resignAt(id: string) {
    setSigningElementId(id);
    setShowSignaturePad(true);
  }

  function handleSignatureConfirm(dataUrl: string) {
    setShowSignaturePad(false);
    setSavedSignature(dataUrl);
    if (signingElementId) {
      updateElement(signingElementId, { dataUrl });
      setSigningElementId(null);
    }
  }

  function updateElement(id: string, patch: Partial<FormElement>) {
    setElements((prev) => prev.map((el) => (el.id === id ? ({ ...el, ...patch } as FormElement) : el)));
    resetOutput();
  }

  function deleteElement(id: string) {
    setElements((prev) => prev.filter((el) => el.id !== id));
    resetOutput();
  }

  function startDrag(id: string, event: React.PointerEvent) {
    event.stopPropagation();
    const box = previewBoxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const el = elements.find((item) => item.id === id);
    if (!el || el.kind === "label") return;
    const startX = event.clientX;
    const startY = event.clientY;
    const start = { x: el.xPct, y: el.yPct };
    const elWidthPct = el.widthPct;
    const elHeightPct = el.heightPct;
    let hasMoved = false;

    function onMove(moveEvent: PointerEvent) {
      const rawDx = moveEvent.clientX - startX;
      const rawDy = moveEvent.clientY - startY;
      if (!hasMoved) {
        if (Math.abs(rawDx) < DRAG_THRESHOLD_PX && Math.abs(rawDy) < DRAG_THRESHOLD_PX) return;
        hasMoved = true;
      }
      const dx = rawDx / rect.width;
      const dy = rawDy / rect.height;
      updateElement(id, {
        xPct: Math.min(1 - elWidthPct, Math.max(0, start.x + dx)),
        yPct: Math.min(1 - elHeightPct, Math.max(0, start.y + dy)),
      });
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function startResize(id: string, event: React.PointerEvent) {
    event.stopPropagation();
    const box = previewBoxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const el = elements.find((item) => item.id === id);
    if (!el || el.kind === "label") return;
    const startX = event.clientX;
    const startY = event.clientY;
    const start = { width: el.widthPct, height: el.heightPct };
    const elXPct = el.xPct;
    const elYPct = el.yPct;
    // Images resize with a locked aspect ratio (width drives height); form
    // fields resize freely in both directions, same as before.
    const isImage = el.kind === "image";
    const aspectRatio = el.kind === "image" ? el.aspectRatio : 0;
    const pageWidthPt = pageSizePt?.width ?? 1;
    const pageHeightPt = pageSizePt?.height ?? 1;

    function onMove(moveEvent: PointerEvent) {
      const dx = (moveEvent.clientX - startX) / rect.width;
      const newWidthPct = Math.max(0.03, Math.min(1 - elXPct, start.width + dx));
      if (isImage) {
        const newHeightPct = Math.min(1 - elYPct, (newWidthPct * pageWidthPt * aspectRatio) / pageHeightPt);
        updateElement(id, { widthPct: newWidthPct, heightPct: newHeightPct });
      } else {
        const dy = (moveEvent.clientY - startY) / rect.height;
        updateElement(id, {
          widthPct: newWidthPct,
          heightPct: Math.max(0.02, Math.min(1 - elYPct, start.height + dy)),
        });
      }
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  // Text Field / Textarea resize from any of the 8 handles (matching Edit
  // PDF) — unlike startResize above, dragging a "north" or "west" handle
  // keeps the OPPOSITE edge fixed by also moving x/y, not just width/height.
  function startFieldResize(id: string, dir: ResizeHandleDir, event: React.PointerEvent) {
    event.stopPropagation();
    const box = previewBoxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const el = elements.find((item) => item.id === id);
    if (!el || (el.kind !== "field" && el.kind !== "signature")) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const start = { x: el.xPct, y: el.yPct, width: el.widthPct, height: el.heightPct };
    const hasW = dir.includes("w");
    const hasE = dir.includes("e");
    const hasN = dir.includes("n");
    const hasS = dir.includes("s");

    function onMove(moveEvent: PointerEvent) {
      const dx = (moveEvent.clientX - startX) / rect.width;
      const dy = (moveEvent.clientY - startY) / rect.height;
      const patch: { xPct?: number; yPct?: number; widthPct?: number; heightPct?: number } = {};

      if (hasE) {
        patch.widthPct = Math.max(0.03, Math.min(1 - start.x, start.width + dx));
      } else if (hasW) {
        const newX = Math.min(start.x + start.width - 0.03, Math.max(0, start.x + dx));
        patch.xPct = newX;
        patch.widthPct = start.width + (start.x - newX);
      }

      if (hasS) {
        patch.heightPct = Math.max(0.02, Math.min(1 - start.y, start.height + dy));
      } else if (hasN) {
        const newY = Math.min(start.y + start.height - 0.02, Math.max(0, start.y + dy));
        patch.yPct = newY;
        patch.heightPct = start.height + (start.y - newY);
      }

      updateElement(id, patch);
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  async function handleSave() {
    if (!file || elements.length === 0) return;
    setStatus("working");
    setErrorMessage("");

    try {
      const { PDFDocument, TextAlignment, StandardFonts, rgb } = await import("pdf-lib");
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const form = doc.getForm();
      const pages = doc.getPages();
      const usedNames = new Set<string>();
      const radioGroups = new Map<string, ReturnType<typeof form.createRadioGroup>>();
      const imageCache = new Map<string, Awaited<ReturnType<typeof doc.embedPng>>>();
      const ALIGNMENT: Record<Align, number> = {
        left: TextAlignment.Left,
        center: TextAlignment.Center,
        right: TextAlignment.Right,
      };
      // Standard (built-in) font per family/weight/style combo, embedded once
      // and reused — same approach Edit PDF uses for its own text tool.
      const STANDARD_FONTS: Record<LabelFontFamily, Record<"regular" | "bold" | "italic" | "boldItalic", string>> = {
        "sans-serif": {
          regular: StandardFonts.Helvetica,
          bold: StandardFonts.HelveticaBold,
          italic: StandardFonts.HelveticaOblique,
          boldItalic: StandardFonts.HelveticaBoldOblique,
        },
        serif: {
          regular: StandardFonts.TimesRoman,
          bold: StandardFonts.TimesRomanBold,
          italic: StandardFonts.TimesRomanItalic,
          boldItalic: StandardFonts.TimesRomanBoldItalic,
        },
        monospace: {
          regular: StandardFonts.Courier,
          bold: StandardFonts.CourierBold,
          italic: StandardFonts.CourierOblique,
          boldItalic: StandardFonts.CourierBoldOblique,
        },
      };
      const labelFontCache = new Map<string, Awaited<ReturnType<typeof doc.embedFont>>>();
      async function getLabelFont(family: LabelFontFamily, bold: boolean, italic: boolean) {
        const variant = bold && italic ? "boldItalic" : bold ? "bold" : italic ? "italic" : "regular";
        const key = `${family}-${variant}`;
        let font = labelFontCache.get(key);
        if (!font) {
          font = await doc.embedFont(STANDARD_FONTS[family][variant]);
          labelFontCache.set(key, font);
        }
        return font;
      }

      for (let index = 0; index < elements.length; index++) {
        const el = elements[index];
        const page = pages[el.pageIndex];
        if (!page) continue;
        const { width: pageWidth, height: pageHeight } = page.getSize();

        if (el.kind === "label") {
          if (!el.text.trim()) continue;
          const font = await getLabelFont(el.fontFamily, el.isBold, el.isItalic);
          const textWidth = font.widthOfTextAtSize(el.text, el.fontSizePt);
          const cx = el.xPct * pageWidth;
          const cy = pageHeight - el.yPct * pageHeight;
          page.drawText(el.text, {
            x: cx - textWidth / 2,
            y: cy - el.fontSizePt / 2,
            size: el.fontSizePt,
            font,
            color: rgb(...hexToRgbFloat(el.colorHex)),
          });
          continue;
        }

        const xPt = el.xPct * pageWidth;
        const wPt = el.widthPct * pageWidth;
        const hPt = el.heightPct * pageHeight;
        const yPt = pageHeight - el.yPct * pageHeight - hPt;

        if (el.kind === "image") {
          let image = imageCache.get(el.dataUrl);
          if (!image) {
            const isPng = el.dataUrl.startsWith("data:image/png");
            const buf = await (await fetch(el.dataUrl)).arrayBuffer();
            image = isPng ? await doc.embedPng(buf) : await doc.embedJpg(buf);
            imageCache.set(el.dataUrl, image);
          }
          page.drawImage(image, { x: xPt, y: yPt, width: wPt, height: hPt });
          continue;
        }

        if (el.kind === "signature") {
          if (!el.dataUrl) {
            // Never signed — still draw the outlined box, so a printed copy
            // shows the recipient exactly where to sign by hand.
            page.drawRectangle({
              x: xPt,
              y: yPt,
              width: wPt,
              height: hPt,
              borderColor: rgb(...hexToRgbFloat(el.borderColor)),
              borderWidth: 1,
            });
            continue;
          }
          let image = imageCache.get(el.dataUrl);
          if (!image) {
            image = await doc.embedPng(await (await fetch(el.dataUrl)).arrayBuffer());
            imageCache.set(el.dataUrl, image);
          }
          // Fit the drawing within the box (object-contain), rather than
          // stretching it to the box's own shape.
          const fitted = image.scaleToFit(wPt, hPt);
          page.drawImage(image, {
            x: xPt + (wPt - fitted.width) / 2,
            y: yPt + (hPt - fitted.height) / 2,
            width: fitted.width,
            height: fitted.height,
          });
          continue;
        }

        if (el.type === "radio") {
          const groupName = el.name.trim() || `radio_group_${index + 1}`;
          let group = radioGroups.get(groupName);
          if (!group) {
            group = form.createRadioGroup(groupName);
            radioGroups.set(groupName, group);
          }
          if (el.required) group.enableRequired();
          const optionValue = el.optionValue?.trim() || `Option ${index + 1}`;
          const sizePt = wPt;
          group.addOptionToPage(optionValue, page, { x: xPt, y: yPt, width: sizePt, height: sizePt });
          if (el.selectedByDefault) group.select(optionValue);
          continue;
        }

        let name = el.name.trim() || `${el.type}_${index + 1}`;
        while (usedNames.has(name)) name = `${name}_${index + 1}`;
        usedNames.add(name);

        if (el.type === "checkbox") {
          const sizePt = wPt;
          const field = form.createCheckBox(name);
          field.addToPage(page, { x: xPt, y: yPt, width: sizePt, height: sizePt, borderWidth: 1 });
          if (el.checked) field.check();
          if (el.required) field.enableRequired();
        } else if (el.type === "dropdown") {
          const opts = (el.options ?? "")
            .split(",")
            .map((o) => o.trim())
            .filter(Boolean);
          const field = form.createDropdown(name);
          if (opts.length > 0) field.addOptions(opts);
          field.addToPage(page, { x: xPt, y: yPt, width: wPt, height: hPt, borderWidth: 1 });
          if (el.fontSizePt) field.setFontSize(el.fontSizePt);
          const defaultValue = el.defaultValue?.trim();
          if (defaultValue && opts.includes(defaultValue)) field.select(defaultValue);
          if (el.required) field.enableRequired();
        } else {
          const field = form.createTextField(name);
          if (el.type === "textarea") field.enableMultiline();
          field.addToPage(page, {
            x: xPt,
            y: yPt,
            width: wPt,
            height: hPt,
            borderWidth: 1,
            textColor: rgb(...hexToRgbFloat(el.textColor ?? "#000000")),
            borderColor: rgb(...hexToRgbFloat(el.borderColor ?? "#2663bb")),
          });
          if (el.align) field.setAlignment(ALIGNMENT[el.align]);
          if (el.fontSizePt) field.setFontSize(el.fontSizePt);
          if (el.defaultValue) field.setText(el.defaultValue);
          if (el.required) field.enableRequired();
        }
      }

      const outBytes = await doc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("done");
      setShowSuccessModal(true);
    } catch (error) {
      setStatus("error");
      setErrorMessage(describeError(error, error instanceof Error ? `Couldn't create the form: ${error.message}` : "Couldn't create the form.",));
    }
  }

  if (!file) {
    return (
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const dropped = event.dataTransfer.files?.[0];
          if (dropped) loadFile(dropped);
        }}
        className="card flex min-h-48 flex-col items-center justify-center gap-3 py-8 text-center"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ToolIcon name="upload" className="h-6 w-6" />
        </span>
        <p className="text-sm text-base-content/70">Drag & drop a PDF here, or</p>
        <div className="flex">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="btn btn-primary btn-md rounded-r-none"
          >
            Choose File
          </button>
          <UploadSourceMenu onFile={loadFile} />
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(event) => {
            const selected = event.target.files?.[0];
            if (selected) loadFile(selected);
          }}
        />
      </div>
    );
  }

  return (
    <div className="card border border-base-300 bg-base-100 p-6 shadow-sm">
      {showSignaturePad && (
        <SignaturePad
          onConfirm={handleSignatureConfirm}
          onCancel={() => {
            setShowSignaturePad(false);
            setSigningElementId(null);
          }}
        />
      )}

      {showSuccessModal && downloadUrl && (
        <SaveSuccessModal
          downloadUrl={downloadUrl}
          downloadFileName="form.pdf"
          onClose={() => setShowSuccessModal(false)}
        />
      )}

      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 truncate">
          <ToolIcon name="checkbox" className="h-4 w-4 text-primary" />
          <span className="truncate text-base-content/80">{file.name}</span>
          {pageCount && <span className="badge badge-neutral badge-sm">{pageCount} pages</span>}
        </span>
        <button
          type="button"
          onClick={() => {
            setFile(null);
            setPageCount(null);
            setElements([]);
            resetOutput();
          }}
          className="text-xs text-base-content/50 hover:text-error"
        >
          Replace
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={addLabel} className="btn btn-outline btn-sm">
          <ToolIcon name="text-tool" className="h-4 w-4" />
          Label
        </button>
        {(["text", "textarea", "checkbox", "radio", "dropdown"] as FieldType[]).map((type) => (
          <button key={type} type="button" onClick={() => addField(type)} className="btn btn-outline btn-sm">
            <ToolIcon name={FIELD_ICONS[type]} className="h-4 w-4" />
            {FIELD_LABELS[type]}
          </button>
        ))}
        <button type="button" onClick={() => imageInputRef.current?.click()} className="btn btn-outline btn-sm">
          <ToolIcon name="image-tool" className="h-4 w-4" />
          Add Image
        </button>
        <button type="button" onClick={addSignatureBox} className="btn btn-outline btn-sm">
          <ToolIcon name="signature" className="h-4 w-4" />
          Signature box
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png, image/jpeg"
          className="hidden"
          onChange={(event) => {
            const selected = event.target.files?.[0];
            if (selected) addImageFile(selected);
            event.target.value = "";
          }}
        />
      </div>
      <p className="mt-2 text-xs text-base-content/50">
        Label places static instructional text on the page (click it to edit and show its formatting
        toolbar) — it isn&apos;t a fillable field. Signature box places a resizable placeholder you can
        position first and sign afterward (or leave blank as a &quot;sign here&quot; box) — the signature
        itself is a drawn image stamp, not a fillable field either, since pdf-lib can&apos;t create a real
        cryptographic signature field. Two radio buttons become one mutually-exclusive group when they
        share the same group name.
      </p>

      <div className="mt-5 flex flex-col items-center gap-2">
        <div
          ref={scrollContainerRef}
          onPointerDown={() => setSelectedElementId(null)}
          className="max-h-[75vh] w-full overflow-auto rounded-sm border border-base-300 bg-base-200 p-4 shadow-sm"
        >
          <div ref={previewBoxRef} className="relative mx-auto w-fit select-none">
            <canvas ref={previewCanvasRef} className="block" />

            {currentPageElements.map((el) => {
              if (el.kind === "label") {
                const isSelected = selectedElementId === el.id;
                return (
                  <div
                    key={el.id}
                    onPointerDown={(event) => startLabelDrag(el.id, event)}
                    style={{
                      touchAction: "none",
                      left: `${el.xPct * 100}%`,
                      top: `${el.yPct * 100}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                    className="absolute cursor-grab active:cursor-grabbing"
                  >
                    {isSelected && (
                      <LabelEditToolbar
                        style={{
                          fontSizePt: el.fontSizePt,
                          isBold: el.isBold,
                          isItalic: el.isItalic,
                          fontFamily: el.fontFamily,
                          colorHex: el.colorHex,
                        }}
                        onUpdate={(patch) => updateElement(el.id, patch)}
                        onDragHandlePointerDown={(event) => startLabelDrag(el.id, event)}
                        onDuplicate={() => duplicateLabel(el.id)}
                        onDelete={() => {
                          deleteElement(el.id);
                          setSelectedElementId(null);
                        }}
                      />
                    )}
                    <input
                      type="text"
                      value={el.text}
                      onFocus={() => setSelectedElementId(el.id)}
                      onChange={(event) => updateElement(el.id, { text: event.target.value })}
                      style={{
                        fontSize: Math.max(8, el.fontSizePt * previewScale),
                        fontWeight: el.isBold ? 700 : 400,
                        fontStyle: el.isItalic ? "italic" : "normal",
                        fontFamily: LABEL_FONT_CSS[el.fontFamily],
                        color: el.colorHex,
                      }}
                      className={`min-w-0 border-none bg-transparent p-0.5 outline-none ${
                        isSelected ? "rounded ring-2 ring-primary/50" : ""
                      }`}
                      size={Math.max(4, el.text.length)}
                    />
                  </div>
                );
              }

              const style = {
                left: `${el.xPct * 100}%`,
                top: `${el.yPct * 100}%`,
                width: `${el.widthPct * 100}%`,
                height: `${el.heightPct * 100}%`,
              };

              if (el.kind === "image") {
                return (
                  <div key={el.id} className="group absolute" style={style}>
                    <img src={el.dataUrl} alt="" draggable={false} className="h-full w-full object-contain" />
                    <span
                      onPointerDown={(event) => startDrag(el.id, event)}
                      style={{ touchAction: "none" }}
                      className="absolute inset-0 cursor-grab opacity-0 ring-2 ring-primary/60 group-hover:opacity-100 active:cursor-grabbing"
                      title="Drag to move"
                    />
                    <button
                      type="button"
                      onClick={() => deleteElement(el.id)}
                      className="btn btn-ghost btn-xs btn-square absolute -top-2 -right-2 z-10 bg-base-100 text-error shadow"
                      aria-label="Delete image"
                    >
                      <ToolIcon name="close" className="h-3 w-3" />
                    </button>
                    <div
                      onPointerDown={(event) => startResize(el.id, event)}
                      style={{ touchAction: "none" }}
                      className="absolute -right-1.5 -bottom-1.5 h-3 w-3 cursor-nwse-resize rounded-sm border border-white bg-primary"
                    />
                  </div>
                );
              }

              if (el.kind === "signature") {
                const isSelected = selectedElementId === el.id;
                const borderColor = el.borderColor ?? "#2663bb";
                return (
                  <div
                    key={el.id}
                    onClick={() => setSelectedElementId(el.id)}
                    onPointerDown={(event) => startDrag(el.id, event)}
                    style={{ ...style, touchAction: "none", borderWidth: 2, borderStyle: "dashed", borderColor }}
                    className="absolute flex flex-col cursor-grab rounded bg-base-100/80 active:cursor-grabbing"
                  >
                    {isSelected && (
                      <SignatureBoxToolbar
                        borderColor={borderColor}
                        hasSignature={Boolean(el.dataUrl)}
                        onBorderColorChange={(color) => updateElement(el.id, { borderColor: color })}
                        onSign={() => (el.dataUrl ? resignAt(el.id) : signAt(el.id))}
                        onClear={() => updateElement(el.id, { dataUrl: null })}
                        onDuplicate={() => duplicateSignatureBox(el.id)}
                        onDelete={() => {
                          deleteElement(el.id);
                          setSelectedElementId(null);
                        }}
                      />
                    )}
                    <div
                      className="flex items-center justify-between gap-1 rounded-t px-1 text-[10px] text-white"
                      style={{ backgroundColor: borderColor }}
                    >
                      <span
                        onPointerDown={(event) => startDrag(el.id, event)}
                        style={{ touchAction: "none" }}
                        className="cursor-grab truncate active:cursor-grabbing"
                        title="Drag to move"
                      >
                        Signature box
                      </span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteElement(el.id);
                          setSelectedElementId(null);
                        }}
                        className="shrink-0"
                        aria-label="Delete field"
                      >
                        <ToolIcon name="close" className="h-2.5 w-2.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (el.dataUrl) setSelectedElementId(el.id);
                        else signAt(el.id);
                      }}
                      className="flex min-h-0 flex-1 items-center justify-center"
                    >
                      {el.dataUrl ? (
                        <img src={el.dataUrl} alt="" draggable={false} className="h-full w-full object-contain p-1" />
                      ) : (
                        <span className="flex flex-col items-center gap-1 text-xs text-base-content/40">
                          <ToolIcon name="signature" className="h-6 w-6" />
                          Click to sign
                        </span>
                      )}
                    </button>
                    {RESIZE_HANDLES.map((handle) => (
                      <div
                        key={handle.dir}
                        onPointerDown={(event) => startFieldResize(el.id, handle.dir, event)}
                        style={{ touchAction: "none" }}
                        className={`absolute h-2.5 w-2.5 rounded-sm border border-white bg-primary ${handle.className} ${handle.cursor}`}
                      />
                    ))}
                  </div>
                );
              }

              if (el.type === "text" || el.type === "textarea") {
                const isSelected = selectedElementId === el.id;
                const borderColor = el.borderColor ?? "#2663bb";
                const textColor = el.textColor ?? "#000000";
                const align = el.align ?? "left";
                const fontSizePt = el.fontSizePt ?? 12;
                return (
                  <div
                    key={el.id}
                    onClick={() => setSelectedElementId(el.id)}
                    onPointerDown={(event) => startDrag(el.id, event)}
                    style={{ ...style, touchAction: "none", borderWidth: 2, borderStyle: "dashed", borderColor }}
                    className="absolute flex flex-col cursor-grab rounded bg-base-100/80 active:cursor-grabbing"
                  >
                    {isSelected && (
                      <FormFieldTextToolbar
                        style={{
                          align,
                          fontSizePt,
                          textColor,
                          borderColor,
                          name: el.name,
                          required: el.required ?? false,
                        }}
                        onUpdate={(patch) => updateElement(el.id, patch)}
                        onDuplicate={() => duplicateField(el.id)}
                        onDelete={() => {
                          deleteElement(el.id);
                          setSelectedElementId(null);
                        }}
                      />
                    )}
                    <div
                      className="flex items-center justify-between gap-1 rounded-t px-1 text-[10px] text-white"
                      style={{ backgroundColor: borderColor }}
                    >
                      <span
                        onPointerDown={(event) => startDrag(el.id, event)}
                        style={{ touchAction: "none" }}
                        className="cursor-grab truncate active:cursor-grabbing"
                        title="Drag to move"
                      >
                        {FIELD_LABELS[el.type]}
                        {el.required && " *"}
                      </span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteElement(el.id);
                          setSelectedElementId(null);
                        }}
                        className="shrink-0"
                        aria-label="Delete field"
                      >
                        <ToolIcon name="close" className="h-2.5 w-2.5" />
                      </button>
                    </div>
                    {el.type === "textarea" ? (
                      <textarea
                        value={el.defaultValue ?? ""}
                        onChange={(event) => updateElement(el.id, { defaultValue: event.target.value })}
                        onFocus={() => setSelectedElementId(el.id)}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          startDrag(el.id, event);
                        }}
                        placeholder="Multi-line text"
                        className="min-h-0 flex-1 resize-none border-none bg-transparent px-1 py-0.5 outline-none placeholder:opacity-40"
                        style={{ fontSize: Math.max(8, fontSizePt * previewScale), color: textColor, textAlign: align }}
                      />
                    ) : (
                      <input
                        type="text"
                        value={el.defaultValue ?? ""}
                        onChange={(event) => updateElement(el.id, { defaultValue: event.target.value })}
                        onFocus={() => setSelectedElementId(el.id)}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          startDrag(el.id, event);
                        }}
                        placeholder="Text"
                        className="min-h-0 min-w-0 flex-1 border-none bg-transparent px-1 py-0.5 outline-none placeholder:opacity-40"
                        style={{ fontSize: Math.max(8, fontSizePt * previewScale), color: textColor, textAlign: align }}
                      />
                    )}
                    {RESIZE_HANDLES.map((handle) => (
                      <div
                        key={handle.dir}
                        onPointerDown={(event) => startFieldResize(el.id, handle.dir, event)}
                        style={{ touchAction: "none" }}
                        className={`absolute h-2.5 w-2.5 rounded-sm border border-white bg-primary ${handle.className} ${handle.cursor}`}
                      />
                    ))}
                  </div>
                );
              }

              const isSquare = el.type === "checkbox" || el.type === "radio";
              return (
                <div
                  key={el.id}
                  className="absolute flex flex-col rounded border-2 border-dashed border-primary bg-primary/10"
                  style={style}
                >
                  <div className="flex items-center justify-between gap-1 bg-primary px-1 text-[10px] text-primary-content">
                    <span
                      onPointerDown={(event) => startDrag(el.id, event)}
                      style={{ touchAction: "none" }}
                      className="cursor-grab truncate active:cursor-grabbing"
                      title="Drag to move"
                    >
                      {FIELD_LABELS[el.type]}
                      {el.required && " *"}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteElement(el.id)}
                      className="shrink-0"
                      aria-label="Delete field"
                    >
                      <ToolIcon name="close" className="h-2.5 w-2.5" />
                    </button>
                  </div>
                  {!isSquare && (
                    <div
                      onPointerDown={(event) => startResize(el.id, event)}
                      style={{ touchAction: "none" }}
                      className="absolute -right-1.5 -bottom-1.5 h-3 w-3 cursor-nwse-resize rounded-sm border border-white bg-primary"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-base-content/60">
          {pageCount && pageCount > 1 && (
            <>
              <button
                type="button"
                onClick={() => setCurrentPageIndex((index) => Math.max(0, index - 1))}
                disabled={currentPageIndex === 0}
                className="btn btn-ghost btn-xs btn-square"
                aria-label="Previous page"
              >
                <ToolIcon name="chevron-down" className="h-3.5 w-3.5 rotate-90" />
              </button>
              <span>
                Page {currentPageIndex + 1} of {pageCount}
                {elements.some((el) => el.pageIndex === currentPageIndex) && (
                  <span className="ml-1 text-primary">(has fields)</span>
                )}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPageIndex((index) => Math.min((pageCount ?? 1) - 1, index + 1))}
                disabled={currentPageIndex === pageCount - 1}
                className="btn btn-ghost btn-xs btn-square"
                aria-label="Next page"
              >
                <ToolIcon name="chevron-down" className="h-3.5 w-3.5 -rotate-90" />
              </button>

              <span className="mx-1 h-4 w-px bg-base-300" />
            </>
          )}

          <button
            type="button"
            onClick={() => setZoomPercent((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))}
            className="btn btn-ghost btn-xs btn-square"
            aria-label="Zoom out"
          >
            <ToolIcon name="zoom-out" className="h-3.5 w-3.5" />
          </button>
          <span className="w-10 text-center">{zoomPercent}%</span>
          <button
            type="button"
            onClick={() => setZoomPercent((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
            className="btn btn-ghost btn-xs btn-square"
            aria-label="Zoom in"
          >
            <ToolIcon name="zoom-in" className="h-3.5 w-3.5" />
          </button>
          {zoomPercent !== 100 && (
            <button type="button" onClick={() => setZoomPercent(100)} className="text-primary hover:underline">
              Reset
            </button>
          )}
        </div>
      </div>

      {currentPageElements.length > 0 && (
        <div className="mt-5 space-y-3">
          <p className="text-sm font-medium text-base-content">Fields on this page</p>
          {currentPageElements.map((el) => {
            if (el.kind === "label") {
              return (
                <button
                  key={el.id}
                  type="button"
                  onClick={() => setSelectedElementId(el.id)}
                  className="flex w-full items-center gap-2 rounded-lg border border-base-300 px-3 py-2 text-left text-sm hover:border-primary/40"
                >
                  <span className="badge badge-neutral badge-sm shrink-0">Label</span>
                  <span className="flex-1 truncate text-base-content/80">{el.text || "(empty)"}</span>
                  <span className="text-xs text-primary">Edit</span>
                </button>
              );
            }

            if (el.kind === "image") {
              return (
                <div key={el.id} className="flex items-center gap-2 rounded-lg border border-base-300 px-3 py-2 text-sm">
                  <span className="badge badge-neutral badge-sm shrink-0">Image</span>
                  <img src={el.dataUrl} alt="" className="h-6 w-6 rounded object-contain" />
                  <span className="flex-1 truncate text-xs text-base-content/50">Drag on the page to reposition</span>
                </div>
              );
            }

            if (el.kind === "signature") {
              return (
                <button
                  key={el.id}
                  type="button"
                  onClick={() => setSelectedElementId(el.id)}
                  className="flex w-full items-center gap-2 rounded-lg border border-base-300 px-3 py-2 text-left text-sm hover:border-primary/40"
                >
                  <span className="badge badge-neutral badge-sm shrink-0">Signature box</span>
                  <span className="flex-1 truncate text-xs text-base-content/50">
                    {el.dataUrl ? "Signed" : "Not signed yet"}
                  </span>
                  <span className="text-xs text-primary">Edit</span>
                </button>
              );
            }

            if (el.type === "text" || el.type === "textarea") {
              return (
                <button
                  key={el.id}
                  type="button"
                  onClick={() => setSelectedElementId(el.id)}
                  className="flex w-full items-center gap-2 rounded-lg border border-base-300 px-3 py-2 text-left text-sm hover:border-primary/40"
                >
                  <span className="badge badge-neutral badge-sm shrink-0">{FIELD_LABELS[el.type]}</span>
                  <span className="flex-1 truncate text-base-content/80">{el.name}</span>
                  <span className="text-xs text-primary">Edit on page</span>
                </button>
              );
            }

            const takesTextStyle = el.type === "dropdown";

            return (
              <div key={el.id} className="space-y-2 rounded-lg border border-base-300 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge badge-neutral badge-sm shrink-0">{FIELD_LABELS[el.type]}</span>
                  <input
                    type="text"
                    value={el.name}
                    onChange={(event) => updateElement(el.id, { name: event.target.value })}
                    placeholder={el.type === "radio" ? "Group name" : "Field name"}
                    className="input input-bordered input-xs min-w-0 flex-1"
                  />
                  {el.type === "radio" && (
                    <input
                      type="text"
                      value={el.optionValue ?? ""}
                      onChange={(event) => updateElement(el.id, { optionValue: event.target.value })}
                      placeholder="Option value"
                      className="input input-bordered input-xs min-w-0 flex-1"
                    />
                  )}
                  {el.type === "dropdown" && (
                    <input
                      type="text"
                      value={el.options ?? ""}
                      onChange={(event) => updateElement(el.id, { options: event.target.value })}
                      placeholder="Options, comma separated"
                      className="input input-bordered input-xs min-w-0 flex-[2]"
                    />
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-base-content/70">
                  {takesTextStyle && (
                    <>
                      <input
                        type="text"
                        value={el.defaultValue ?? ""}
                        onChange={(event) => updateElement(el.id, { defaultValue: event.target.value })}
                        placeholder={el.type === "dropdown" ? "Pre-selected option" : "Default value"}
                        className="input input-bordered input-xs w-36"
                      />

                      <div className="flex items-center gap-1">
                        <span>Size</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateElement(el.id, { fontSizePt: Math.max(MIN_FONT_SIZE_PT, (el.fontSizePt ?? 12) - 1) })
                          }
                          className="btn btn-ghost btn-xs btn-square"
                          aria-label="Smaller font"
                        >
                          <ToolIcon name="minus" className="h-3 w-3" />
                        </button>
                        <span className="w-4 text-center tabular-nums">{el.fontSizePt ?? 12}</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateElement(el.id, { fontSizePt: Math.min(MAX_FONT_SIZE_PT, (el.fontSizePt ?? 12) + 1) })
                          }
                          className="btn btn-ghost btn-xs btn-square"
                          aria-label="Bigger font"
                        >
                          <ToolIcon name="plus" className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="join">
                        {ALIGN_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => updateElement(el.id, { align: option.value })}
                            aria-label={option.label}
                            title={option.label}
                            className={`btn btn-xs join-item btn-square ${
                              (el.align ?? "left") === option.value ? "btn-primary" : "btn-ghost border border-base-300"
                            }`}
                          >
                            <ToolIcon name={option.icon} className="h-3 w-3" />
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {el.type === "checkbox" && (
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={el.checked ?? false}
                        onChange={(event) => updateElement(el.id, { checked: event.target.checked })}
                        className="checkbox checkbox-xs"
                      />
                      Ticked by default
                    </label>
                  )}

                  {el.type === "radio" && (
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={el.selectedByDefault ?? false}
                        onChange={(event) => updateElement(el.id, { selectedByDefault: event.target.checked })}
                        className="checkbox checkbox-xs"
                      />
                      Selected by default
                    </label>
                  )}

                  <label className="ml-auto flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={el.required ?? false}
                      onChange={(event) => updateElement(el.id, { required: event.target.checked })}
                      className="checkbox checkbox-xs"
                    />
                    Required
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      <div className="mt-6">
        {status === "done" && downloadUrl ? (
          <a href={downloadUrl} download="form.pdf" className="btn btn-primary w-full">
            <ToolIcon name="download" className="h-4 w-4" />
            Download PDF
          </a>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            disabled={elements.length === 0 || status === "working"}
            className="btn btn-primary w-full"
          >
            {status === "working" ? "Creating form..." : "Create Form"}
          </button>
        )}
      </div>
    </div>
  );
}
