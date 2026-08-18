"use client";

import { useEffect, useRef, useState } from "react";
import { colorSwatches, resolveSwatchHex } from "@/lib/colorSwatches";
import { ToolIcon } from "./icons";
import { NativeColorInput } from "./NativeColorInput";

export type FormFieldTextStyle = {
  align: "left" | "center" | "right";
  fontSizePt: number;
  textColor: string;
  borderColor: string;
  name: string;
  required: boolean;
};

/**
 * Floating toolbar for Create Forms' Text Field / Textarea — the same shape
 * as Edit PDF's FormTextEditToolbar (border color, align, font size, text
 * color, a field-name/required popover, duplicate, delete). The default
 * value itself is typed directly into the field on the page, not here —
 * same as Edit PDF's form-text tool.
 * Kept as its own component since CreateFormsWorkspace has its own
 * self-contained element model rather than sharing PdfEditorWorkspace's
 * EditorElement union. Rendered as a child of the field's own
 * absolutely-positioned wrapper (`bottom-full`), so — unlike the original —
 * it needs no JS pixel-position/viewport-clamping math.
 */
export function FormFieldTextToolbar({
  style,
  onUpdate,
  onDuplicate,
  onDelete,
}: {
  style: FormFieldTextStyle;
  onUpdate: (patch: Partial<FormFieldTextStyle>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [openMenu, setOpenMenu] = useState<"border" | "color" | "settings" | null>(null);
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
      onClick={(event) => event.stopPropagation()}
      className="absolute bottom-full left-0 z-20 mb-1.5 flex items-center gap-0.5 rounded-lg border border-primary/30 bg-base-100 p-1 whitespace-nowrap shadow-lg"
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenMenu((current) => (current === "border" ? null : "border"))}
          className="btn btn-ghost btn-xs btn-square relative"
          title={`Border color (currently ${style.borderColor})`}
        >
          <ToolIcon name="shape-rect" className="h-3.5 w-3.5" />
          <span
            className="absolute right-0 bottom-0 h-2 w-2 rounded-full border border-base-100"
            style={{ backgroundColor: style.borderColor }}
          />
        </button>
        {openMenu === "border" && (
          <div className="absolute top-full left-0 z-30 mt-1 flex gap-2 rounded-box bg-base-100 p-2 shadow-lg">
            {colorSwatches.map((swatch) => (
              <button
                key={swatch.id}
                type="button"
                onClick={() => {
                  onUpdate({ borderColor: resolveSwatchHex(swatch.id) });
                  setOpenMenu(null);
                }}
                aria-label={`Use ${swatch.id} border color`}
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
                value={style.borderColor}
                onChange={(color) => onUpdate({ borderColor: color })}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
          </div>
        )}
      </div>

      <span className="mx-0.5 h-4 w-px bg-base-300" />

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => onUpdate({ align: "left" })}
          className={`btn btn-xs btn-square ${style.align === "left" ? "btn-primary" : "btn-ghost"}`}
          title="Align left"
        >
          <ToolIcon name="align-left" className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onUpdate({ align: "center" })}
          className={`btn btn-xs btn-square ${style.align === "center" ? "btn-primary" : "btn-ghost"}`}
          title="Align center"
        >
          <ToolIcon name="align-center" className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onUpdate({ align: "right" })}
          className={`btn btn-xs btn-square ${style.align === "right" ? "btn-primary" : "btn-ghost"}`}
          title="Align right"
        >
          <ToolIcon name="align-right" className="h-3.5 w-3.5" />
        </button>
      </div>

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
          onClick={() => onUpdate({ fontSizePt: Math.min(72, Math.round(style.fontSizePt) + 1) })}
          className="btn btn-ghost btn-xs btn-square"
          aria-label="Increase font size"
          title="Increase font size"
        >
          <ToolIcon name="plus" className="h-3 w-3" />
        </button>
      </div>

      <span className="mx-0.5 h-4 w-px bg-base-300" />

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenMenu((current) => (current === "color" ? null : "color"))}
          className="btn btn-ghost btn-xs btn-square relative"
          title={`Font color (currently ${style.textColor})`}
        >
          <ToolIcon name="palette" className="h-3.5 w-3.5" />
          <span
            className="absolute right-0 bottom-0 h-2 w-2 rounded-full border border-base-100"
            style={{ backgroundColor: style.textColor }}
          />
        </button>
        {openMenu === "color" && (
          <div className="absolute top-full left-0 z-30 mt-1 flex gap-2 rounded-box bg-base-100 p-2 shadow-lg">
            <button
              type="button"
              onClick={() => {
                onUpdate({ textColor: "#000000" });
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
                  onUpdate({ textColor: resolveSwatchHex(swatch.id) });
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
                value={style.textColor}
                onChange={(color) => onUpdate({ textColor: color })}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
          </div>
        )}
      </div>

      <span className="mx-0.5 h-4 w-px bg-base-300" />

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenMenu((current) => (current === "settings" ? null : "settings"))}
          className={`btn btn-xs gap-1 ${openMenu === "settings" ? "btn-primary" : "btn-ghost"}`}
          title="Field name & settings"
        >
          <ToolIcon name="form-field" className="h-3.5 w-3.5" />
          <ToolIcon name="chevron-down" className="h-3 w-3" />
        </button>

        {openMenu === "settings" && (
          <div className="absolute top-full left-0 z-30 mt-1 w-56 space-y-3 rounded-box border border-base-300 bg-base-100 p-3 shadow-lg">
            <label className="block text-xs font-medium text-base-content">
              Field name
              <input
                type="text"
                value={style.name}
                onChange={(event) => onUpdate({ name: event.target.value })}
                className="input input-bordered input-sm mt-1 w-full"
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-base-content">
              <input
                type="checkbox"
                checked={style.required}
                onChange={(event) => onUpdate({ required: event.target.checked })}
                className="checkbox checkbox-sm"
              />
              Field is mandatory
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
