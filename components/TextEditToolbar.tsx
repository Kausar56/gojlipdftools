"use client";

import { useEffect, useRef, useState } from "react";
import { colorSwatches, resolveSwatchHex } from "@/lib/colorSwatches";
import type { EditorElement, FontFamily } from "@/lib/editorElements";
import { ToolIcon } from "./icons";
import { NativeColorInput } from "./NativeColorInput";

type TextLikeElement = Extract<EditorElement, { type: "text" } | { type: "text-edit" }>;

export function TextEditToolbar({
  element,
  topPt,
  heightPt,
  scale,
  onUpdate,
  onDuplicate,
  onDelete,
}: {
  element: TextLikeElement;
  topPt: number;
  heightPt: number;
  scale: number;
  onUpdate: (patch: Partial<TextLikeElement>) => void;
  onDuplicate?: () => void;
  onDelete: () => void;
}) {
  // Which popover is open, driven entirely by explicit clicks rather than
  // CSS :focus-within — daisyUI's dropdown opens whenever anything inside it
  // gains focus, which proved too easy to trigger unintentionally while
  // typing in the textarea right below (e.g. via Tab-order focus shifts),
  // popping the color/family menu open and blocking the text underneath.
  const [openMenu, setOpenMenu] = useState<"family" | "color" | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [openMenu]);

  // Prefer floating just above the text, but when there isn't 44px of room
  // above (text sitting near the top of the page/viewport), flip to below it
  // instead of clamping to 0 — clamping used to leave the toolbar (including
  // the font-size input's spinner arrows) sitting on top of the text itself,
  // covering the last word.
  const topAbove = topPt * scale - 44;
  const top = topAbove >= 0 ? topAbove : topPt * scale + heightPt * scale + 6;

  return (
    <div
      ref={rootRef}
      onMouseDown={(event) => event.stopPropagation()}
      className="absolute z-20 flex items-center gap-0.5 rounded-lg border border-primary/30 bg-base-100 p-1 shadow-lg"
      style={{
        left: element.xPt * scale,
        top,
      }}
    >
      <button
        type="button"
        onClick={() => onUpdate({ isBold: !element.isBold })}
        className={`btn btn-xs btn-square ${element.isBold ? "btn-primary" : "btn-ghost"}`}
        aria-label="Bold"
        title="Bold"
      >
        <ToolIcon name="bold" className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onUpdate({ isItalic: !element.isItalic })}
        className={`btn btn-xs btn-square ${element.isItalic ? "btn-primary" : "btn-ghost"}`}
        aria-label="Italic"
        title="Italic"
      >
        <ToolIcon name="italic" className="h-3.5 w-3.5" />
      </button>

      <span className="mx-0.5 h-4 w-px bg-base-300" />

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => onUpdate({ fontSizePt: Math.max(6, Math.round(element.fontSizePt) - 1) })}
          className="btn btn-ghost btn-xs btn-square"
          aria-label="Decrease font size"
          title="Decrease font size"
        >
          <ToolIcon name="minus" className="h-3 w-3" />
        </button>
        <input
          type="number"
          min={6}
          max={200}
          value={Math.round(element.fontSizePt)}
          onChange={(event) => onUpdate({ fontSizePt: Number(event.target.value) || element.fontSizePt })}
          className="input input-bordered input-xs w-10 px-1 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          aria-label="Font size"
          title="Font size"
        />
        <button
          type="button"
          onClick={() => onUpdate({ fontSizePt: Math.min(200, Math.round(element.fontSizePt) + 1) })}
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
            {(["sans-serif", "serif", "monospace"] as FontFamily[]).map((family) => (
              <li key={family}>
                <button
                  type="button"
                  onClick={() => {
                    onUpdate({ fontFamily: family });
                    setOpenMenu(null);
                  }}
                  className={element.fontFamily === family ? "active" : ""}
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
          title={`Text color (currently ${element.color})`}
          style={{ color: element.color }}
        >
          <ToolIcon name="palette" className="h-3.5 w-3.5" />
          {/* A solid swatch, not just the icon's own stroke tint — for a
              faint/light detected color (a common case for faded original
              text), the thin icon outline barely showed the actual shade,
              so it didn't read as "auto-selected" even though element.color
              was already correct. */}
          <span
            className="absolute right-0 bottom-0 h-2 w-2 rounded-full border border-base-100"
            style={{ backgroundColor: element.color }}
          />
        </button>
        {openMenu === "color" && (
          <div className="absolute top-full left-0 z-30 mt-1 flex gap-2 rounded-box bg-base-100 p-2 shadow-lg">
            {colorSwatches.map((swatch) => (
              <button
                key={swatch.id}
                type="button"
                onClick={() => {
                  onUpdate({ color: resolveSwatchHex(swatch.id) });
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
                value={element.color}
                onChange={(color) => onUpdate({ color })}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
          </div>
        )}
      </div>

      {onDuplicate && (
        <>
          <span className="mx-0.5 h-4 w-px bg-base-300" />
          <button
            type="button"
            onClick={onDuplicate}
            className="btn btn-ghost btn-xs btn-square"
            aria-label="Duplicate"
            title="Duplicate"
          >
            <ToolIcon name="duplicate" className="h-3.5 w-3.5" />
          </button>
        </>
      )}

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
