"use client";

import { useEffect, useRef, useState } from "react";
import { colorSwatches, resolveSwatchHex } from "@/lib/colorSwatches";
import type { EditorElement } from "@/lib/editorElements";
import { ToolIcon } from "./icons";
import { NativeColorInput } from "./NativeColorInput";

type RadioElement = Extract<EditorElement, { type: "form-radio" }>;

export function RadioEditToolbar({
  element,
  scale,
  onUpdate,
  onDuplicate,
  onDelete,
}: {
  element: RadioElement;
  scale: number;
  onUpdate: (patch: Partial<RadioElement>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [openMenu, setOpenMenu] = useState<"border" | "color" | "settings" | null>(null);
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
      style={{ left, top: Math.max(0, element.yPt * scale - 44) }}
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

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenMenu((current) => (current === "color" ? null : "color"))}
          className="btn btn-ghost btn-xs btn-square relative"
          title={`Dot color (currently ${element.textColor})`}
        >
          <ToolIcon name="radio-button" className="h-3.5 w-3.5" />
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
          onClick={() => setOpenMenu((current) => (current === "settings" ? null : "settings"))}
          className={`btn btn-xs gap-1 ${openMenu === "settings" ? "btn-primary" : "btn-ghost"}`}
          title="Group, option & settings"
        >
          <ToolIcon name="form-field" className="h-3.5 w-3.5" />
          <ToolIcon name="chevron-down" className="h-3 w-3" />
        </button>

        {openMenu === "settings" && (
          <div className="absolute top-full left-0 z-30 mt-1 w-56 space-y-3 rounded-box border border-base-300 bg-base-100 p-3 shadow-lg">
            <label className="block text-xs font-medium text-base-content">
              Group name
              <input
                type="text"
                value={element.groupName}
                onChange={(event) => onUpdate({ groupName: event.target.value })}
                title="Radio buttons sharing this group name become one choice"
                className="input input-bordered input-sm mt-1 w-full"
              />
            </label>

            <label className="block text-xs font-medium text-base-content">
              Option label
              <input
                type="text"
                value={element.optionLabel}
                onChange={(event) => onUpdate({ optionLabel: event.target.value })}
                className="input input-bordered input-sm mt-1 w-full"
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-base-content">
              <input
                type="checkbox"
                checked={element.selectedByDefault}
                onChange={(event) => onUpdate({ selectedByDefault: event.target.checked })}
                className="checkbox checkbox-sm"
              />
              Selected by default
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

      <span className="mx-0.5 h-4 w-px bg-base-300" />

      <button type="button" onClick={onDuplicate} className="btn btn-ghost btn-xs btn-square" aria-label="Duplicate" title="Duplicate">
        <ToolIcon name="duplicate" className="h-3.5 w-3.5" />
      </button>

      <button type="button" onClick={onDelete} className="btn btn-ghost btn-xs btn-square text-error" aria-label="Delete" title="Delete">
        <ToolIcon name="trash" className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
