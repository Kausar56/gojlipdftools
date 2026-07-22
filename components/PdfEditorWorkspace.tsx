"use client";

import { useEffect, useRef, useState } from "react";
import { ToolIcon } from "./icons";
import { SignaturePad } from "./SignaturePad";
import { colorSwatches, hexToRgbFloat } from "@/lib/colorSwatches";
import { loadPdfjs } from "@/lib/pdfjs";
import { createElementId, type DetectedTextItem, type EditorElement, type Point } from "@/lib/editorElements";

type ToolId = "cursor" | "text" | "draw" | "shapes" | "image" | "highlight" | "signature" | "erase";
type ShapeType = "rectangle" | "circle" | "line";

const editorTools: { id: ToolId; icon: string; label: string }[] = [
  { id: "cursor", icon: "cursor", label: "Select" },
  { id: "text", icon: "text-tool", label: "Text" },
  { id: "draw", icon: "pen", label: "Draw" },
  { id: "shapes", icon: "shapes", label: "Shapes" },
  { id: "image", icon: "image-tool", label: "Image" },
  { id: "highlight", icon: "highlighter", label: "Highlight" },
  { id: "signature", icon: "signature", label: "Signature" },
  { id: "erase", icon: "eraser", label: "Erase" },
];

const shapeTypes: { id: ShapeType; icon: string; label: string }[] = [
  { id: "rectangle", icon: "shape-rect", label: "Rectangle" },
  { id: "circle", icon: "shape-circle", label: "Circle" },
  { id: "line", icon: "shape-line", label: "Line" },
];

const toolsWithColor = new Set<ToolId>(["text", "draw", "shapes", "highlight"]);
const CLICK_TO_ADD: ToolId[] = ["text", "shapes", "highlight"];
const BASE_RENDER_WIDTH = 640;
const ASCENT_RATIO = 0.8;

export function PdfEditorWorkspace() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<import("pdfjs-dist").PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSizePt, setPageSizePt] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [isRendering, setIsRendering] = useState(false);
  const [textItems, setTextItems] = useState<DetectedTextItem[]>([]);

  const [activeTool, setActiveTool] = useState<ToolId>("cursor");
  const [activeColorHex, setActiveColorHex] = useState<string>(colorSwatches[0].hex);
  const [activeFontSizePt, setActiveFontSizePt] = useState(16);
  const [shapeType, setShapeType] = useState<ShapeType>("rectangle");
  const [elements, setElements] = useState<EditorElement[]>([]);
  const [drawingPath, setDrawingPath] = useState<Point[] | null>(null);
  const [lineDraft, setLineDraft] = useState<{ start: Point; current: Point } | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [past, setPast] = useState<EditorElement[][]>([]);
  const [future, setFuture] = useState<EditorElement[][]>([]);

  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);


  useEffect(() => {
    if (!pdfDoc) return;
    let cancelled = false;

    (async () => {
      setIsRendering(true);
      const page = await pdfDoc.getPage(currentPage + 1);
      const baseViewport = page.getViewport({ scale: 1 });
      const renderScale = (BASE_RENDER_WIDTH * (zoomPercent / 100)) / baseViewport.width;
      const viewport = page.getViewport({ scale: renderScale });

      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      if (cancelled) return;

      const pageHeightPt = baseViewport.height;
      const content = await page.getTextContent();
      const detected: DetectedTextItem[] = [];
      content.items.forEach((item, itemIndex) => {
        if (!("str" in item) || !item.str.trim()) return;
        const t = item.transform;
        const isAxisAligned = Math.abs(t[1]) < 0.01 && Math.abs(t[2]) < 0.01;
        if (!isAxisAligned) return;

        const fontSizePt = Math.abs(t[3]);
        const baselinePt = t[5];
        const topPt = pageHeightPt - (baselinePt + fontSizePt * ASCENT_RATIO);

        detected.push({
          itemIndex,
          xPt: t[4],
          topPt,
          widthPt: item.width,
          heightPt: item.height || fontSizePt,
          baselinePt,
          fontSizePt,
          str: item.str,
        });
      });
      if (cancelled) return;

      setTextItems(detected);
      setScale(renderScale);
      setPageSizePt({ width: baseViewport.width, height: pageHeightPt });
      setIsRendering(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, currentPage, zoomPercent]);

  async function loadFile(selected: File) {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setStatus("idle");
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
  }

  function toPagePoint(event: React.MouseEvent): Point {
    const rect = overlayRef.current!.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / scale,
      y: (event.clientY - rect.top) / scale,
    };
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
    setElements((prev) => prev.map((el) => (el.id === id ? ({ ...el, ...patch } as EditorElement) : el)));
  }

  function removeElement(id: string) {
    pushHistory();
    setElements((prev) => prev.filter((el) => el.id !== id));
  }

  function activateTextItem(item: DetectedTextItem) {
    addElement({
      id: createElementId(),
      pageIndex: currentPage,
      type: "text-edit",
      itemIndex: item.itemIndex,
      xPt: item.xPt,
      topPt: item.topPt,
      widthPt: item.widthPt,
      heightPt: item.heightPt,
      baselinePt: item.baselinePt,
      fontSizePt: item.fontSizePt,
      text: item.str,
      color: "#000000",
    });
  }

  function startPan(event: React.MouseEvent) {
    const container = scrollContainerRef.current;
    if (!container) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const startScrollLeft = container.scrollLeft;
    const startScrollTop = container.scrollTop;
    setIsPanning(true);

    function onMove(moveEvent: MouseEvent) {
      scrollContainerRef.current!.scrollLeft = startScrollLeft - (moveEvent.clientX - startX);
      scrollContainerRef.current!.scrollTop = startScrollTop - (moveEvent.clientY - startY);
    }
    function onUp() {
      setIsPanning(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function handleOverlayMouseDown(event: React.MouseEvent) {
    if (event.target !== event.currentTarget) return;

    if (activeTool === "cursor") {
      startPan(event);
      return;
    }

    const point = toPagePoint(event);

    if (activeTool === "draw") {
      setDrawingPath([point]);
      return;
    }

    if (activeTool === "shapes" && shapeType === "line") {
      setLineDraft({ start: point, current: point });
      return;
    }

    if (!CLICK_TO_ADD.includes(activeTool)) return;

    if (activeTool === "text") {
      addElement({
        id: createElementId(),
        pageIndex: currentPage,
        type: "text",
        xPt: point.x,
        yPt: point.y,
        widthPt: 200,
        text: "Text",
        color: activeColorHex,
        fontSizePt: activeFontSizePt,
      });
    } else if (activeTool === "shapes") {
      addElement({
        id: createElementId(),
        pageIndex: currentPage,
        type: shapeType === "circle" ? "ellipse" : "rect",
        xPt: point.x - 60,
        yPt: point.y - 40,
        widthPt: 120,
        heightPt: 80,
        color: activeColorHex,
      });
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
    }
  }

  function handleOverlayMouseMove(event: React.MouseEvent) {
    if (activeTool === "draw" && drawingPath) {
      setDrawingPath((prev) => (prev ? [...prev, toPagePoint(event)] : prev));
    } else if (activeTool === "shapes" && shapeType === "line" && lineDraft) {
      setLineDraft((prev) => (prev ? { ...prev, current: toPagePoint(event) } : prev));
    }
  }

  function handleOverlayMouseUp() {
    if (activeTool === "draw" && drawingPath && drawingPath.length > 1) {
      addElement({
        id: createElementId(),
        pageIndex: currentPage,
        type: "path",
        points: drawingPath,
        color: activeColorHex,
        strokeWidthPt: 2,
      });
    }
    if (activeTool === "shapes" && shapeType === "line" && lineDraft) {
      const { start, current } = lineDraft;
      if (Math.hypot(current.x - start.x, current.y - start.y) > 2) {
        addElement({
          id: createElementId(),
          pageIndex: currentPage,
          type: "line",
          x1Pt: start.x,
          y1Pt: start.y,
          x2Pt: current.x,
          y2Pt: current.y,
          color: activeColorHex,
          strokeWidthPt: 2,
        });
      }
    }
    setDrawingPath(null);
    setLineDraft(null);
  }

  function startElementDrag(el: EditorElement, event: React.MouseEvent) {
    event.stopPropagation();
    if (activeTool === "erase") {
      removeElement(el.id);
      return;
    }
    if (el.type === "path" || el.type === "text-edit" || el.type === "line") return;
    if (el.type === "text" && activeTool === "cursor") {
      // allow clicking into the textarea without initiating a drag
      return;
    }

    pushHistory();

    const startX = event.clientX;
    const startY = event.clientY;
    const startXPt = el.xPt;
    const startYPt = el.yPt;

    function onMove(moveEvent: MouseEvent) {
      const dxPt = (moveEvent.clientX - startX) / scale;
      const dyPt = (moveEvent.clientY - startY) / scale;
      updateElement(el.id, { xPt: startXPt + dxPt, yPt: startYPt + dyPt });
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function startElementResize(el: EditorElement, event: React.MouseEvent) {
    event.stopPropagation();
    if (el.type === "path" || el.type === "text-edit" || el.type === "line") return;

    pushHistory();

    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = el.widthPt;
    const isText = el.type === "text";
    const startHeight = !isText ? el.heightPt : 0;
    const startFontSize = isText ? el.fontSizePt : 0;

    function onMove(moveEvent: MouseEvent) {
      const dxPt = (moveEvent.clientX - startX) / scale;
      const dyPt = (moveEvent.clientY - startY) / scale;

      if (isText) {
        // For text, resizing controls font size (what users actually expect)
        // rather than just the wrap width of the invisible text box.
        const newFontSize = Math.max(8, Math.min(160, startFontSize + dyPt));
        const ratio = newFontSize / startFontSize;
        updateElement(el.id, { fontSizePt: newFontSize, widthPt: Math.max(20, startWidth * ratio) });
      } else {
        const newWidth = Math.max(20, startWidth + dxPt);
        const newHeight = Math.max(20, startHeight + dyPt);
        updateElement(el.id, { widthPt: newWidth, heightPt: newHeight });
      }
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function handleToolClick(toolId: ToolId) {
    setActiveTool(toolId);
    if (toolId === "image") {
      imageInputRef.current?.click();
    } else if (toolId === "signature") {
      setShowSignaturePad(true);
    }
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
    });
  }

  function handleSignatureConfirm(dataUrl: string) {
    const widthPt = Math.min(pageSizePt.width * 0.4 || 160, 220);
    const heightPt = widthPt * (180 / 400);
    addElement({
      id: createElementId(),
      pageIndex: currentPage,
      type: "image",
      xPt: (pageSizePt.width - widthPt) / 2,
      yPt: (pageSizePt.height - heightPt) / 2,
      widthPt,
      heightPt,
      dataUrl,
      mimeType: "image/png",
    });
    setShowSignaturePad(false);
  }

  async function handleSave() {
    if (!file) return;
    setStatus("saving");
    setErrorMessage("");

    try {
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const imageCache = new Map<string, Awaited<ReturnType<typeof doc.embedPng>>>();

      for (const el of elements) {
        const page = doc.getPage(el.pageIndex);
        const { height: pageHeightPt } = page.getSize();
        const [r, g, b] = hexToRgbFloat("color" in el ? el.color : "#000000");

        if (el.type === "text") {
          if (!el.text.trim()) continue;
          page.drawText(el.text, {
            x: el.xPt,
            y: pageHeightPt - el.yPt - el.fontSizePt,
            size: el.fontSizePt,
            font,
            color: rgb(r, g, b),
            lineHeight: el.fontSizePt * 1.2,
            maxWidth: el.widthPt,
          });
        } else if (el.type === "rect") {
          page.drawRectangle({
            x: el.xPt,
            y: pageHeightPt - el.yPt - el.heightPt,
            width: el.widthPt,
            height: el.heightPt,
            borderColor: rgb(r, g, b),
            borderWidth: 2,
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
          page.drawEllipse({
            x: el.xPt + el.widthPt / 2,
            y: pageHeightPt - el.yPt - el.heightPt / 2,
            xScale: el.widthPt / 2,
            yScale: el.heightPt / 2,
            borderColor: rgb(r, g, b),
            borderWidth: 2,
          });
        } else if (el.type === "line") {
          page.drawLine({
            start: { x: el.x1Pt, y: pageHeightPt - el.y1Pt },
            end: { x: el.x2Pt, y: pageHeightPt - el.y2Pt },
            thickness: el.strokeWidthPt,
            color: rgb(r, g, b),
          });
        } else if (el.type === "image") {
          let image = imageCache.get(el.dataUrl);
          if (!image) {
            const res = await fetch(el.dataUrl);
            const buf = await res.arrayBuffer();
            image = el.mimeType === "image/png" ? await doc.embedPng(buf) : await doc.embedJpg(buf);
            imageCache.set(el.dataUrl, image);
          }
          page.drawImage(image, {
            x: el.xPt,
            y: pageHeightPt - el.yPt - el.heightPt,
            width: el.widthPt,
            height: el.heightPt,
          });
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
          const descentPt = el.heightPt * (1 - ASCENT_RATIO);
          const pad = 1.5;
          const newTextWidthPt = el.text.trim() ? font.widthOfTextAtSize(el.text, el.fontSizePt) : 0;
          const maskWidth = Math.max(el.widthPt, newTextWidthPt) + pad * 2;

          // Real editing of existing PDF text isn't possible without rewriting the
          // page's content stream — instead we mask the original glyphs with a white
          // rectangle at their exact position, then draw the replacement on top.
          page.drawRectangle({
            x: el.xPt - pad,
            y: el.baselinePt - descentPt - pad,
            width: maskWidth,
            height: el.heightPt + pad * 2,
            color: rgb(1, 1, 1),
          });

          if (el.text.trim()) {
            page.drawText(el.text, {
              x: el.xPt,
              y: el.baselinePt,
              size: el.fontSizePt,
              font,
              color: rgb(r, g, b),
            });
          }
        }
      }

      const outBytes = await doc.save();
      const blob = new Blob([outBytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("done");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? `Couldn't save this PDF: ${error.message}` : "Couldn't save this PDF.",
      );
    }
  }

  if (!file) {
    return (
      <div className="card border border-base-300 bg-base-100 p-6 shadow-sm">
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const dropped = event.dataTransfer.files?.[0];
            if (dropped) loadFile(dropped);
          }}
          className="flex min-h-100 flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-base-300 p-10 text-center"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ToolIcon name="upload" className="h-7 w-7" />
          </span>
          <div>
            <p className="font-semibold text-base-content">Upload a PDF to start editing</p>
            <p className="mt-1 text-sm text-base-content/60">
              Drag & drop a file here, or choose one from your device.
            </p>
          </div>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-primary btn-sm">
            Choose File
          </button>
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

  return (
    <div className="overflow-hidden rounded-2xl border border-base-300 bg-base-100">
      {showSignaturePad && (
        <SignaturePad onConfirm={handleSignatureConfirm} onCancel={() => setShowSignaturePad(false)} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-base-300 px-4 py-3">
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

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={undo}
            disabled={past.length === 0}
            className="btn btn-ghost btn-xs btn-square"
            aria-label="Undo"
          >
            <ToolIcon name="undo" className="h-4 w-4" />
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

          <div className="mx-2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setZoomPercent((z) => Math.max(50, z - 10))}
              className="btn btn-ghost btn-xs btn-square"
              aria-label="Zoom out"
            >
              <ToolIcon name="zoom-out" className="h-4 w-4" />
            </button>
            <span className="w-10 text-center text-xs text-base-content/60">{zoomPercent}%</span>
            <button
              type="button"
              onClick={() => setZoomPercent((z) => Math.min(200, z + 10))}
              className="btn btn-ghost btn-xs btn-square"
              aria-label="Zoom in"
            >
              <ToolIcon name="zoom-in" className="h-4 w-4" />
            </button>
          </div>

          {status === "done" && downloadUrl ? (
            <a href={downloadUrl} download="edited.pdf" className="btn btn-primary btn-sm">
              <ToolIcon name="download" className="h-4 w-4" />
              Download
            </a>
          ) : (
            <button type="button" onClick={handleSave} disabled={status === "saving"} className="btn btn-primary btn-sm">
              {status === "saving" ? "Saving..." : "Save PDF"}
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <p className="mx-4 mt-3 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{errorMessage}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-b border-base-300 px-4 py-2">
        {editorTools.map((tool) => (
          <button
            key={tool.id}
            type="button"
            onClick={() => handleToolClick(tool.id)}
            aria-label={tool.label}
            title={tool.label}
            className={`btn btn-sm btn-square ${activeTool === tool.id ? "btn-primary" : "btn-ghost"}`}
          >
            <ToolIcon name={tool.icon} className="h-4 w-4" />
          </button>
        ))}

        {activeTool === "shapes" && (
          <div className="flex items-center gap-1 border-l border-base-300 pl-2">
            {shapeTypes.map((shape) => (
              <button
                key={shape.id}
                type="button"
                onClick={() => setShapeType(shape.id)}
                aria-label={shape.label}
                title={shape.label}
                className={`btn btn-xs btn-square ${shapeType === shape.id ? "btn-primary" : "btn-ghost"}`}
              >
                <ToolIcon name={shape.icon} className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        )}

        {activeTool === "text" && (
          <label className="flex items-center gap-1.5 border-l border-base-300 pl-2 text-xs text-base-content/60">
            Size
            <input
              type="number"
              min={8}
              max={160}
              value={activeFontSizePt}
              onChange={(event) => setActiveFontSizePt(Number(event.target.value) || 16)}
              className="input input-bordered input-xs w-14"
              aria-label="Text font size"
            />
          </label>
        )}

        {toolsWithColor.has(activeTool) && (
          <div className="flex items-center gap-1.5 border-l border-base-300 pl-2">
            {colorSwatches.map((swatch) => (
              <button
                key={swatch.id}
                type="button"
                onClick={() => setActiveColorHex(swatch.hex)}
                aria-label={`Use ${swatch.id} color`}
                className={`h-5 w-5 rounded-full ${swatch.className} ${
                  activeColorHex === swatch.hex ? "ring-2 ring-base-content/40 ring-offset-2 ring-offset-base-100" : ""
                }`}
              />
            ))}
            <label
              className="relative flex h-5 w-5 items-center justify-center rounded-full border border-base-300"
              style={{
                background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
                boxShadow: !colorSwatches.some((s) => s.hex === activeColorHex)
                  ? "0 0 0 2px var(--color-base-content)"
                  : undefined,
              }}
              title="Custom color"
              aria-label="Choose a custom color"
            >
              <input
                type="color"
                value={activeColorHex}
                onChange={(event) => setActiveColorHex(event.target.value)}
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

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-3 border-b border-base-300 py-2 text-sm text-base-content/70">
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
        </div>
      )}

      <div ref={scrollContainerRef} className="max-h-[70vh] overflow-auto bg-base-200 p-6">
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
                    <polyline
                      key={el.id}
                      points={el.points.map((p) => `${p.x * scale},${p.y * scale}`).join(" ")}
                      fill="none"
                      stroke={el.color}
                      strokeWidth={el.strokeWidthPt * scale}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                {drawingPath && (
                  <polyline
                    points={drawingPath.map((p) => `${p.x * scale},${p.y * scale}`).join(" ")}
                    fill="none"
                    stroke={activeColorHex}
                    strokeWidth={2 * scale}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                {pageElements
                  .filter((el) => el.type === "line")
                  .map((el) => (
                    <line
                      key={el.id}
                      x1={el.x1Pt * scale}
                      y1={el.y1Pt * scale}
                      x2={el.x2Pt * scale}
                      y2={el.y2Pt * scale}
                      stroke={el.color}
                      strokeWidth={el.strokeWidthPt * scale}
                      strokeLinecap="round"
                    />
                  ))}
                {lineDraft && (
                  <line
                    x1={lineDraft.start.x * scale}
                    y1={lineDraft.start.y * scale}
                    x2={lineDraft.current.x * scale}
                    y2={lineDraft.current.y * scale}
                    stroke={activeColorHex}
                    strokeWidth={2 * scale}
                    strokeLinecap="round"
                  />
                )}
              </svg>

              <div
                ref={overlayRef}
                className="absolute inset-0"
                style={{
                  cursor: activeTool === "cursor" ? (isPanning ? "grabbing" : "grab") : "crosshair",
                }}
                onMouseDown={handleOverlayMouseDown}
                onMouseMove={handleOverlayMouseMove}
                onMouseUp={handleOverlayMouseUp}
              >
                {pageElements
                  .filter((el) => el.type === "text-edit")
                  .map((el) => (
                    <div
                      key={el.id}
                      className="group absolute bg-white"
                      style={{
                        left: el.xPt * scale - 1.5 * scale,
                        top: el.topPt * scale - 1.5 * scale,
                        width: el.widthPt * scale + 3 * scale,
                        height: el.heightPt * scale + 3 * scale,
                      }}
                    >
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
                        onChange={(event) => updateElement(el.id, { text: event.target.value })}
                        onFocus={pushHistory}
                        onMouseDown={(event) => event.stopPropagation()}
                        className="h-full w-full resize-none border border-dashed border-transparent bg-transparent leading-none outline-none hover:border-base-content/20 focus:border-primary/50"
                        style={{ color: el.color, fontSize: el.fontSizePt * scale }}
                      />
                    </div>
                  ))}

                {pageElements
                  .filter((el) => el.type !== "path" && el.type !== "text-edit" && el.type !== "line")
                  .map((el) => (
                    <div
                      key={el.id}
                      onMouseDown={(event) => startElementDrag(el, event)}
                      className="group absolute"
                      style={{
                        left: el.xPt * scale,
                        top: el.yPt * scale,
                        width: el.widthPt * scale,
                        height: el.type === "text" ? undefined : el.heightPt * scale,
                        cursor: activeTool === "erase" ? "not-allowed" : "move",
                      }}
                    >
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeElement(el.id);
                        }}
                        className="absolute -right-2 -top-2 z-10 hidden h-5 w-5 items-center justify-center rounded-full bg-error text-white group-hover:flex"
                        aria-label="Delete"
                      >
                        <ToolIcon name="close" className="h-3 w-3" />
                      </button>

                      {el.type === "text" && (
                        <textarea
                          value={el.text}
                          onChange={(event) => updateElement(el.id, { text: event.target.value })}
                          onFocus={pushHistory}
                          onMouseDown={(event) => event.stopPropagation()}
                          className="w-full resize-none border border-dashed border-transparent bg-transparent leading-tight outline-none hover:border-base-content/20 focus:border-primary/50"
                          style={{ color: el.color, fontSize: el.fontSizePt * scale, minHeight: el.fontSizePt * scale * 1.4 }}
                        />
                      )}

                      {el.type === "rect" && (
                        <div className="h-full w-full border-2" style={{ borderColor: el.color }} />
                      )}

                      {el.type === "ellipse" && (
                        <div className="h-full w-full rounded-full border-2" style={{ borderColor: el.color }} />
                      )}

                      {el.type === "highlight" && (
                        <div className="h-full w-full" style={{ backgroundColor: el.color, opacity: 0.35 }} />
                      )}

                      {el.type === "image" && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={el.dataUrl} alt="" className="h-full w-full object-contain" draggable={false} />
                      )}

                      <div
                        onMouseDown={(event) => startElementResize(el, event)}
                        title={el.type === "text" ? "Drag to resize text" : "Drag to resize"}
                        className="absolute -bottom-1.5 -right-1.5 z-10 hidden h-3 w-3 cursor-nwse-resize rounded-sm border border-white bg-primary group-hover:block"
                      />
                    </div>
                  ))}
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

