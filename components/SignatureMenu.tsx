"use client";

import { useEffect, useRef, useState } from "react";
import { ToolIcon } from "./icons";

const MENU_WIDTH = 260;

/**
 * The "Sign" toolbar button — plain button the first time (nothing saved
 * yet to show), but once a signature has been drawn once, clicking it opens
 * a small popover with that signature (click to drop it onto the page
 * again) plus a "+ New Signature" option, instead of always reopening the
 * blank drawing pad. Positioned the same way as UploadSourceMenu's popover
 * (fixed, computed from the trigger's own screen position) for the same
 * reason: this button usually sits inside a horizontally-scrolling toolbar
 * row, and an absolutely-positioned popover there gets clipped.
 */
export function SignatureMenu({
  active,
  savedSignature,
  onUseSignature,
  onNewSignature,
}: {
  active: boolean;
  savedSignature: string | null;
  onUseSignature: (dataUrl: string) => void;
  onNewSignature: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function reposition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPos({ top: rect.bottom + 4, left: Math.max(8, rect.left) });
    }
    reposition();

    function onOutsidePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutsidePointerDown);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("mousedown", onOutsidePointerDown);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  function handleTriggerClick() {
    if (!savedSignature) {
      onNewSignature();
      return;
    }
    setOpen((current) => !current);
  }

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={handleTriggerClick}
        className={`btn btn-sm gap-1.5 ${active ? "btn-primary" : "btn-ghost"}`}
      >
        <ToolIcon name="signature" className="h-4 w-4" />
        Sign
        {savedSignature && <ToolIcon name="chevron-down" className="h-3.5 w-3.5" />}
      </button>

      {open && pos && savedSignature && (
        <div
          ref={menuRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: MENU_WIDTH }}
          className="z-50 flex flex-col items-center gap-3 rounded-box border border-base-300 bg-base-100 p-4 shadow-lg"
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onUseSignature(savedSignature);
            }}
            className="flex w-full items-center justify-center rounded-lg border border-transparent p-2 hover:border-base-300"
            title="Use this signature"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={savedSignature} alt="Saved signature" className="h-16 max-w-full object-contain" />
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onNewSignature();
            }}
            className="btn btn-outline btn-primary btn-sm w-full gap-1.5"
          >
            <ToolIcon name="plus" className="h-3.5 w-3.5" />
            New Signature
          </button>
        </div>
      )}
    </>
  );
}
