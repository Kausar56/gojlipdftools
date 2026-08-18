"use client";

import { useEffect, useRef, useState } from "react";
import { colorSwatches, resolveSwatchHex } from "@/lib/colorSwatches";
import { ToolIcon } from "./icons";
import { NativeColorInput } from "./NativeColorInput";

export type LabelFontFamily = "sans-serif" | "serif" | "monospace";
export type LabelStyle = {
  fontSizePt: number;
  isBold: boolean;
  isItalic: boolean;
  fontFamily: LabelFontFamily;
  colorHex: string;
};

/**
 * Floating toolbar for a static text "Label" stamp (Create Forms' equivalent
 * of Edit PDF's TextEditToolbar, kept as its own component rather than
 * sharing that one — CreateFormsWorkspace has its own self-contained element
 * model, same as every other tool workspace in this app, so it isn't coupled
 * to PdfEditorWorkspace's much bigger EditorElement union). Rendered as a
 * child of the label's own absolutely-positioned wrapper (`bottom-full`), so
 * unlike TextEditToolbar it needs no JS pixel-position/viewport-clamping math.
 */
export function LabelEditToolbar({
  style,
  onUpdate,
  onDragHandlePointerDown,
  onDuplicate,
  onDelete,
}: {
  style: LabelStyle;
  onUpdate: (patch: Partial<LabelStyle>) => void;
  onDragHandlePointerDown: (event: React.PointerEvent) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [openMenu, setOpenMenu] = useState<"family" | "color" | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    function onOutsidePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpenMenu(null);
    }
    document.addEventListener("pointerdown", onOutsidePointerDown);
    return () => document.removeEventListener("pointerdown", onOutsidePointerDown);
  }, [openMenu]);

  return (
    <div
      ref={rootRef}
      onPointerDown={(event) => event.stopPropagation()}
      className="absolute bottom-full left-0 z-20 mb-1.5 flex items-center gap-0.5 rounded-lg border border-primary/30 bg-base-100 p-1 whitespace-nowrap shadow-lg"
    >
      <button
        type="button"
        onClick={() => onUpdate({ isBold: !style.isBold })}
        className={`btn btn-xs btn-square ${style.isBold ? "btn-primary" : "btn-ghost"}`}
        aria-label="Bold"
        title="Bold"
      >
        <ToolIcon name="bold" className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onUpdate({ isItalic: !style.isItalic })}
        className={`btn btn-xs btn-square ${style.isItalic ? "btn-primary" : "btn-ghost"}`}
        aria-label="Italic"
        title="Italic"
      >
        <ToolIcon name="italic" className="h-3.5 w-3.5" />
      </button>

      <span className="mx-0.5 h-4 w-px bg-base-300" />

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => onUpdate({ fontSizePt: Math.max(6, Math.round(style.fontSizePt) - 1) })}
          className="btn btn-ghost btn-xs btn-square"
          aria-label="Decrease font size"
          title="Decrease font size"
        >
          <ToolIcon name="minus" className="h-3 w-3" />
        </button>
        <span className="w-6 text-center text-xs tabular-nums">{Math.round(style.fontSizePt)}</span>
        <button
          type="button"
          onClick={() => onUpdate({ fontSizePt: Math.min(120, Math.round(style.fontSizePt) + 1) })}
          className="btn btn-ghost btn-xs btn-square"
          aria-label="Increase font size"
          title="Increase font size"
        >
          <ToolIcon name="plus" className="h-3 w-3" />
        </button>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenMenu((current) => (current === "family" ? null : "family"))}
          className="btn btn-ghost btn-xs gap-1"
          title="Font family"
        >
          <ToolIcon name="font-family" className="h-3.5 w-3.5" />
          <ToolIcon name="chevron-down" className="h-3 w-3" />
        </button>
        {openMenu === "family" && (
          <ul className="menu absolute top-full left-0 z-30 mt-1 w-36 rounded-box bg-base-100 p-2 shadow-lg">
            {(["sans-serif", "serif", "monospace"] as LabelFontFamily[]).map((family) => (
              <li key={family}>
                <button
                  type="button"
                  onClick={() => {
                    onUpdate({ fontFamily: family });
                    setOpenMenu(null);
                  }}
                  className={style.fontFamily === family ? "active" : ""}
                >
                  {family === "sans-serif" ? "Sans-serif" : family === "serif" ? "Serif" : "Monospace"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <span className="mx-0.5 h-4 w-px bg-base-300" />

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenMenu((current) => (current === "color" ? null : "color"))}
          className="btn btn-ghost btn-xs btn-square relative"
          title={`Text color (currently ${style.colorHex})`}
        >
          <ToolIcon name="palette" className="h-3.5 w-3.5" />
          <span
            className="absolute right-0 bottom-0 h-2 w-2 rounded-full border border-base-100"
            style={{ backgroundColor: style.colorHex }}
          />
        </button>
        {openMenu === "color" && (
          <div className="absolute top-full left-0 z-30 mt-1 flex gap-2 rounded-box bg-base-100 p-2 shadow-lg">
            <button
              type="button"
              onClick={() => {
                onUpdate({ colorHex: "#000000" });
                setOpenMenu(null);
              }}
              aria-label="Use black"
              title="Black"
              className="h-7 w-7 rounded-full border border-base-300 bg-black"
            />
            {colorSwatches.map((swatch) => (
              <button
                key={swatch.id}
                type="button"
                onClick={() => {
                  onUpdate({ colorHex: resolveSwatchHex(swatch.id) });
                  setOpenMenu(null);
                }}
                aria-label={`Use ${swatch.id} color`}
                title={`${swatch.id} (${resolveSwatchHex(swatch.id)})`}
                className={`h-7 w-7 rounded-full ${swatch.className}`}
              />
            ))}
            <label className="relative flex h-7 w-7 items-center justify-center rounded-full border border-base-300">
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" }}
              />
              <NativeColorInput
                value={style.colorHex}
                onChange={(colorHex) => onUpdate({ colorHex })}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
          </div>
        )}
      </div>

      <span className="mx-0.5 h-4 w-px bg-base-300" />

      <span
        onPointerDown={onDragHandlePointerDown}
        style={{ touchAction: "none" }}
        className="btn btn-ghost btn-xs btn-square cursor-grab active:cursor-grabbing"
        title="Drag to move"
        aria-label="Drag to move"
      >
        <ToolIcon name="move" className="h-3.5 w-3.5" />
      </span>
      <button
        type="button"
        onClick={onDuplicate}
        className="btn btn-ghost btn-xs btn-square"
        aria-label="Duplicate"
        title="Duplicate"
      >
        <ToolIcon name="duplicate" className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="btn btn-ghost btn-xs btn-square text-error"
        aria-label="Delete"
        title="Delete"
      >
        <ToolIcon name="trash" className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
