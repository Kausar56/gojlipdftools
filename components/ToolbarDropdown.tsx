"use client";

import { useEffect, useRef, useState } from "react";

/**
 * daisyUI's own `.dropdown` relies on the trigger being CSS-focused, and the
 * `.dropdown-content` is `position: absolute` (with a `position-area` anchor
 * fallback that not every browser supports yet) — both get clipped the moment
 * an ancestor sets `overflow-x: auto` for the toolbar's horizontal scroll on
 * phones, since CSS forces `overflow-y` non-visible too once `overflow-x`
 * isn't. `position: fixed`, computed here from the trigger's own screen
 * position, isn't confined by any ancestor's overflow at all, so the menu
 * stays fully visible and clickable regardless of the toolbar's scroll state.
 */
export function ToolbarDropdown({
  trigger,
  triggerClassName,
  menuClassName,
  children,
}: {
  trigger: React.ReactNode;
  triggerClassName: string;
  menuClassName?: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function reposition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) setPos({ top: rect.bottom + 4, left: rect.left });
    }
    reposition();

    function onOutsidePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    }
    // pointerdown (not mousedown) so a tap outside the menu closes it just as
    // reliably on touch as a click does with a mouse.
    document.addEventListener("pointerdown", onOutsidePointerDown);
    // Keep the menu glued to its trigger if the scrollable toolbar row moves
    // while the menu is open (capture:true catches scroll on the row itself,
    // which doesn't bubble like most events).
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("pointerdown", onOutsidePointerDown);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  // The trigger's own left edge can push a wide menu past the right edge of
  // a narrow phone screen — nudge it back on-screen once its real rendered
  // width is measurable (unknown up front since menuClassName varies).
  useEffect(() => {
    if (!open || !pos) return;
    const menu = menuRef.current;
    if (!menu) return;
    const overflowRight = menu.getBoundingClientRect().right - (window.innerWidth - 8);
    if (overflowRight > 0) {
      setPos((current) => (current ? { ...current, left: Math.max(8, current.left - overflowRight) } : current));
    }
  }, [open, pos]);

  return (
    <>
      <button type="button" ref={triggerRef} onClick={() => setOpen((current) => !current)} className={triggerClassName}>
        {trigger}
      </button>
      {open && pos && (
        <div
          ref={menuRef}
          style={{ position: "fixed", top: pos.top, left: pos.left }}
          className={`menu z-50 rounded-box bg-base-100 p-2 shadow-lg ${menuClassName ?? ""}`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </>
  );
}
