"use client";

import { useEffect, useRef, useState } from "react";
import { colorSwatches, resolveSwatchHex } from "@/lib/colorSwatches";
import { NativeColorInput } from "./NativeColorInput";

/**
 * A small color-swatch button that opens a preset palette (black + the site's
 * brand swatches) plus a custom native color input. Shared by any tool that
 * lets a user pick an ink/annotation color inline next to an element, so the
 * palette and popover behavior stay identical everywhere it's used.
 */
export function ColorSwatchPicker({
  value,
  onChange,
  title = "Color",
}: {
  value: string;
  onChange: (hex: string) => void;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="btn btn-ghost btn-xs btn-square"
        aria-label={title}
        title={title}
      >
        <span className="h-3.5 w-3.5 rounded-full border border-base-300" style={{ backgroundColor: value }} />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-30 mt-1 flex gap-1.5 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg">
          <button
            type="button"
            onClick={() => {
              onChange("#000000");
              setOpen(false);
            }}
            aria-label="Use black"
            title="Black"
            className="h-6 w-6 rounded-full border border-base-300 bg-black"
          />
          {colorSwatches.map((swatch) => (
            <button
              key={swatch.id}
              type="button"
              onClick={() => {
                onChange(resolveSwatchHex(swatch.id));
                setOpen(false);
              }}
              aria-label={`Use ${swatch.id} color`}
              title={swatch.id}
              className={`h-6 w-6 rounded-full ${swatch.className}`}
            />
          ))}
          <label className="relative flex h-6 w-6 items-center justify-center rounded-full border border-base-300">
            <div
              className="absolute inset-0 rounded-full"
              style={{ background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" }}
            />
            <NativeColorInput value={value} onChange={onChange} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
          </label>
        </div>
      )}
    </div>
  );
}
