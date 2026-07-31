"use client";

import { useEffect, useRef, useState } from "react";
import { colorSwatches, resolveSwatchHex } from "@/lib/colorSwatches";
import type { EditorElement } from "@/lib/editorElements";
import { ToolIcon } from "./icons";
import { NativeColorInput } from "./NativeColorInput";

type ShapeElement = Extract<EditorElement, { type: "rect" | "ellipse" }>;

export function ShapeEditToolbar({
  element,
  scale,
  onUpdate,
  onDuplicate,
  onDelete,
}: {
  element: ShapeElement;
  scale: number;
  onUpdate: (patch: Partial<ShapeElement>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  // Same reasoning as TextEditToolbar: explicit click-driven open state instead
  // of daisyUI's CSS :focus-within dropdown, which was too easy to trigger
  // unintentionally (see the text toolbar's color-picker fix) for a toolbar
  // that floats directly above content the user is still interacting with.
  const [openMenu, setOpenMenu] = useState<"fill" | "border" | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    const onOutsidePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("pointerdown", onOutsidePointerDown);
    return () => document.removeEventListener("pointerdown", onOutsidePointerDown);
  }, [openMenu]);

  const baseLeft = element.xPt * scale;
  const [left, setLeft] = useState(baseLeft);
  useEffect(() => setLeft(baseLeft), [baseLeft]);

  // On a narrow phone, an element near the page's right edge would otherwise
  // push this toolbar off-screen — nudge it back once its rendered width is
  // measurable.
  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const overflowRight = node.getBoundingClientRect().right - (window.innerWidth - 8);
    if (overflowRight > 0) {
      setLeft((current) => Math.max(8, current - overflowRight));
    }
  }, [left]);

  return (
    <div
      ref={rootRef}
      onPointerDown={(event) => event.stopPropagation()}
      className="absolute z-20 flex items-center gap-0.5 rounded-lg border border-primary/30 bg-base-100 p-1 shadow-lg"
      style={{
        left,
        top: Math.max(0, element.yPt * scale - 44),
      }}
    >
      <div className="flex items-center gap-0.5" title="Border width">
        <button
          type="button"
          onClick={() => onUpdate({ strokeWidthPt: Math.max(0, Math.round(element.strokeWidthPt) - 1) })}
          className="btn btn-ghost btn-xs btn-square"
          aria-label="Decrease border width"
          title="Decrease border width"
        >
          <ToolIcon name="minus" className="h-3 w-3" />
        </button>
        <span className="w-4 text-center text-xs tabular-nums text-base-content/70">
          {Math.round(element.strokeWidthPt)}
        </span>
        <button
          type="button"
          onClick={() => onUpdate({ strokeWidthPt: Math.min(20, Math.round(element.strokeWidthPt) + 1) })}
          className="btn btn-ghost btn-xs btn-square"
          aria-label="Increase border width"
          title="Increase border width"
        >
          <ToolIcon name="plus" className="h-3 w-3" />
        </button>
      </div>

      <span className="mx-0.5 h-4 w-px bg-base-300" />

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenMenu((current) => (current === "fill" ? null : "fill"))}
          className="btn btn-ghost btn-xs btn-square"
          title="Fill color"
          style={{ color: element.fillColorHex ?? undefined }}
        >
          <ToolIcon name="shape-rect" className="h-3.5 w-3.5" />
        </button>
        {openMenu === "fill" && (
          <div className="absolute top-full left-0 z-30 mt-1 flex gap-2 rounded-box bg-base-100 p-2 shadow-lg">
            <button
              type="button"
              onClick={() => {
                onUpdate({ fillColorHex: null });
                setOpenMenu(null);
              }}
              aria-label="No fill"
              title="No fill"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-base-300 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,var(--color-error)_2px,var(--color-error)_3px)]"
            />
            {colorSwatches.map((swatch) => (
              <button
                key={swatch.id}
                type="button"
                onClick={() => {
                  onUpdate({ fillColorHex: resolveSwatchHex(swatch.id) });
                  setOpenMenu(null);
                }}
                aria-label={`Fill with ${swatch.id}`}
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
                value={element.fillColorHex ?? "#ffffff"}
                onChange={(color) => onUpdate({ fillColorHex: color })}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
          </div>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenMenu((current) => (current === "border" ? null : "border"))}
          className="btn btn-ghost btn-xs btn-square"
          title="Border color"
          style={{ color: element.color }}
        >
          <ToolIcon name="palette" className="h-3.5 w-3.5" />
        </button>
        {openMenu === "border" && (
          <div className="absolute top-full left-0 z-30 mt-1 flex gap-2 rounded-box bg-base-100 p-2 shadow-lg">
            {colorSwatches.map((swatch) => (
              <button
                key={swatch.id}
                type="button"
                onClick={() => {
                  onUpdate({ color: resolveSwatchHex(swatch.id) });
                  setOpenMenu(null);
                }}
                aria-label={`Use ${swatch.id} border`}
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
