"use client";

import { ColorSwatchPicker } from "./ColorSwatchPicker";
import { ToolIcon } from "./icons";

/**
 * Floating toolbar for Create Forms' Signature box — border color, Sign/
 * Re-sign (opens SignaturePad targeting this specific box), Clear (once
 * signed), Duplicate, Delete. Positioned as a child of the box's own
 * absolutely-positioned wrapper (`bottom-full`), same pattern as
 * LabelEditToolbar/FormFieldTextToolbar.
 */
export function SignatureBoxToolbar({
  borderColor,
  hasSignature,
  onBorderColorChange,
  onSign,
  onClear,
  onDuplicate,
  onDelete,
}: {
  borderColor: string;
  hasSignature: boolean;
  onBorderColorChange: (hex: string) => void;
  onSign: () => void;
  onClear: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      className="absolute bottom-full left-0 z-20 mb-1.5 flex items-center gap-0.5 rounded-lg border border-primary/30 bg-base-100 p-1 whitespace-nowrap shadow-lg"
    >
      <ColorSwatchPicker value={borderColor} onChange={onBorderColorChange} title="Border color" />

      <span className="mx-0.5 h-4 w-px bg-base-300" />

      <button type="button" onClick={onSign} className="btn btn-ghost btn-xs gap-1" title={hasSignature ? "Re-sign" : "Sign"}>
        <ToolIcon name="signature" className="h-3.5 w-3.5" />
        {hasSignature ? "Re-sign" : "Sign"}
      </button>
      {hasSignature && (
        <button
          type="button"
          onClick={onClear}
          className="btn btn-ghost btn-xs btn-square"
          aria-label="Clear signature"
          title="Clear signature"
        >
          <ToolIcon name="eraser" className="h-3.5 w-3.5" />
        </button>
      )}

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
