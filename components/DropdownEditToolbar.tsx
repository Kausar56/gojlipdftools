"use client";

import { useEffect, useRef, useState } from "react";
import { colorSwatches, resolveSwatchHex } from "@/lib/colorSwatches";
import type { EditorElement } from "@/lib/editorElements";
import { ToolIcon } from "./icons";
import { NativeColorInput } from "./NativeColorInput";

type DropdownElement = Extract<EditorElement, { type: "form-dropdown" }>;

export function DropdownEditToolbar({
  element,
  topPt,
  heightPt,
  scale,
  onUpdate,
  onDuplicate,
  onDelete,
}: {
  element: DropdownElement;
  topPt: number;
  heightPt: number;
  scale: number;
  onUpdate: (patch: Partial<DropdownElement>) => void;
  onDuplicate?: () => void;
  onDelete: () => void;
}) {
  const [openMenu, setOpenMenu] = useState<"border" | "color" | "options" | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    const onOutsidePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("pointerdown", onOutsidePointerDown);
    return () => document.removeEventListener("pointerdown", onOutsidePointerDown);
  }, [openMenu]);

  // Same "flip below if not enough room above" as TextEditToolbar — the
  // options popover is tall, so it especially needs the room.
  const topAbove = topPt * scale - 44;
  const top = topAbove >= 0 ? topAbove : topPt * scale + heightPt * scale + 6;

  const baseLeft = element.xPt * scale;
  const [left, setLeft] = useState(baseLeft);
  useEffect(() => setLeft(baseLeft), [baseLeft]);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const overflowRight = node.getBoundingClientRect().right - (window.innerWidth - 8);
    if (overflowRight > 0) setLeft((current) => Math.max(8, current - overflowRight));
  }, [left, openMenu]);

  return (
    <div
      ref={rootRef}
      onPointerDown={(event) => event.stopPropagation()}
      className="absolute z-20 flex items-center gap-0.5 rounded-lg border border-primary/30 bg-base-100 p-1 shadow-lg"
      style={{ left, top }}
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenMenu((current) => (current === "border" ? null : "border"))}
          className="btn btn-ghost btn-xs btn-square relative"
          title={`Border color (currently ${element.borderColor})`}
        >
          <ToolIcon name="shape-rect" className="h-3.5 w-3.5" />
          <span
            className="absolute right-0 bottom-0 h-2 w-2 rounded-full border border-base-100"
            style={{ backgroundColor: element.borderColor }}
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
                value={element.borderColor}
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
          className={`btn btn-xs btn-square ${element.align === "left" ? "btn-primary" : "btn-ghost"}`}
          title="Align left"
        >
          <ToolIcon name="align-left" className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onUpdate({ align: "center" })}
          className={`btn btn-xs btn-square ${element.align === "center" ? "btn-primary" : "btn-ghost"}`}
          title="Align center"
        >
          <ToolIcon name="align-center" className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onUpdate({ align: "right" })}
          className={`btn btn-xs btn-square ${element.align === "right" ? "btn-primary" : "btn-ghost"}`}
          title="Align right"
        >
          <ToolIcon name="align-right" className="h-3.5 w-3.5" />
        </button>
      </div>

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
          max={72}
          value={Math.round(element.fontSizePt)}
          onChange={(event) => onUpdate({ fontSizePt: Number(event.target.value) || element.fontSizePt })}
          className="input input-bordered input-xs w-10 px-1 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          aria-label="Font size"
          title="Font size"
        />
        <button
          type="button"
          onClick={() => onUpdate({ fontSizePt: Math.min(72, Math.round(element.fontSizePt) + 1) })}
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
          title={`Font color (currently ${element.textColor})`}
        >
          <ToolIcon name="palette" className="h-3.5 w-3.5" />
          <span
            className="absolute right-0 bottom-0 h-2 w-2 rounded-full border border-base-100"
            style={{ backgroundColor: element.textColor }}
          />
        </button>
        {openMenu === "color" && (
          <div className="absolute top-full left-0 z-30 mt-1 flex gap-2 rounded-box bg-base-100 p-2 shadow-lg">
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
                value={element.textColor}
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
          onClick={() => setOpenMenu((current) => (current === "options" ? null : "options"))}
          className={`btn btn-xs gap-1 ${openMenu === "options" ? "btn-primary" : "btn-ghost"}`}
          title="Field name & options"
        >
          <ToolIcon name="dropdown-list" className="h-3.5 w-3.5" />
          <ToolIcon name="chevron-down" className="h-3 w-3" />
        </button>

        {openMenu === "options" && (
          <div className="absolute top-full left-0 z-30 mt-1 w-64 space-y-3 rounded-box border border-base-300 bg-base-100 p-3 shadow-lg">
            <label className="block text-xs font-medium text-base-content">
              Field name
              <input
                type="text"
                value={element.fieldName}
                onChange={(event) => onUpdate({ fieldName: event.target.value })}
                className="input input-bordered input-sm mt-1 w-full"
              />
            </label>

            <label className="block text-xs font-medium text-base-content">
              Options <span className="font-normal text-base-content/50">(one per line)</span>
              <textarea
                value={element.optionsText}
                onChange={(event) => onUpdate({ optionsText: event.target.value })}
                rows={4}
                className="textarea textarea-bordered mt-1 w-full text-sm"
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-base-content">
              <input
                type="checkbox"
                checked={element.multiSelect}
                onChange={(event) => onUpdate({ multiSelect: event.target.checked })}
                className="checkbox checkbox-sm"
              />
              Allow multiple selections
            </label>

            <label className="flex items-center gap-2 text-sm text-base-content">
              <input
                type="checkbox"
                checked={element.required}
                onChange={(event) => onUpdate({ required: event.target.checked })}
                className="checkbox checkbox-sm"
              />
              Field is mandatory
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
