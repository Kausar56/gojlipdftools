"use client";

import { useRef, useState } from "react";
import { ToolIcon } from "./icons";

export function SignaturePad({
  onConfirm,
  onCancel,
}: {
  onConfirm: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  function getPos(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawingRef.current = true;
    const { x, y } = getPos(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(event);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111111";
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  }

  function onPointerUp() {
    drawingRef.current = false;
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  function confirm() {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    onConfirm(canvas.toDataURL("image/png"));
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl border border-base-300 bg-base-100 p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-base-content">Draw your signature</p>
          <button type="button" onClick={onCancel} aria-label="Close" className="btn btn-ghost btn-xs btn-square">
            <ToolIcon name="close" className="h-4 w-4" />
          </button>
        </div>
        <canvas
          ref={canvasRef}
          width={400}
          height={180}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          className="mt-3 w-full touch-none rounded-lg border border-base-300 bg-base-200"
        />
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={clear} className="btn btn-outline btn-sm flex-1">
            Clear
          </button>
          <button type="button" onClick={confirm} disabled={!hasDrawn} className="btn btn-primary btn-sm flex-1">
            Use Signature
          </button>
        </div>
      </div>
    </div>
  );
}
