"use client";

import { useEffect, useRef, useState } from "react";
import type { EditorElement } from "@/lib/editorElements";
import { ToolIcon } from "./icons";

type ImageElement = Extract<EditorElement, { type: "image" }>;

export function ImageEditToolbar({
  element,
  scale,
  onUpdate,
  onDuplicate,
  onDelete,
}: {
  element: ImageElement;
  scale: number;
  onUpdate: (patch: Partial<ImageElement>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  const baseLeft = element.xPt * scale;
  const [left, setLeft] = useState(baseLeft);
  useEffect(() => setLeft(baseLeft), [baseLeft]);

  // On a narrow phone, an image near the page's right edge would otherwise
  // push this toolbar off-screen — nudge it back once its rendered width is
  // measurable.
  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const overflowRight = node.getBoundingClientRect().right - (window.innerWidth - 8);
    if (overflowRight > 0) setLeft((current) => Math.max(8, current - overflowRight));
  }, [left]);

  function rotateBy(deltaDeg: number) {
    onUpdate({ rotationDeg: (((element.rotationDeg + deltaDeg) % 360) + 360) % 360 });
  }

  return (
    <div
      ref={rootRef}
      onPointerDown={(event) => event.stopPropagation()}
      className="absolute z-20 flex items-center gap-0.5 rounded-lg border border-primary/30 bg-base-100 p-1 shadow-lg"
      style={{ left, top: Math.max(0, element.yPt * scale - 44) }}
    >
      <button
        type="button"
        onClick={() => rotateBy(-90)}
        className="btn btn-ghost btn-xs btn-square"
        aria-label="Rotate left"
        title="Rotate left 90°"
      >
        <ToolIcon name="rotate-left" className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => rotateBy(90)}
        className="btn btn-ghost btn-xs btn-square"
        aria-label="Rotate right"
        title="Rotate right 90°"
      >
        <ToolIcon name="rotate-right" className="h-3.5 w-3.5" />
      </button>

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
