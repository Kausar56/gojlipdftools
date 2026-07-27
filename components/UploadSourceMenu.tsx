"use client";

import { useEffect, useRef, useState } from "react";
import { ToolIcon } from "./icons";

const COMING_SOON_SOURCES = ["Dropbox", "Google Drive", "OneDrive"];
const MENU_WIDTH = 256;

/**
 * The dropdown-arrow segment next to a "Choose File" button, offering other
 * places to pull a file from. Dropbox/Google Drive/OneDrive each need their
 * own registered app + API key from their respective developer consoles
 * (Dropbox App Console, Google Cloud Console, Azure AD) before they can
 * actually open a picker — those are shown as "Coming soon" until real
 * credentials exist. Web Address (URL) needs no credentials, so it's fully
 * wired up: fetches the file client-side and hands it to the same callback
 * a local file pick would use.
 *
 * Fetching an arbitrary URL from the browser only works when the remote
 * server's CORS policy allows it — this app has no server-side proxy (it's
 * intentionally 100% client-side), so some URLs will fail. That's surfaced
 * as an error message rather than silently doing nothing.
 *
 * The menu is `position: fixed`, positioned from the trigger button's own
 * screen position — not `absolute` inside a `relative` wrapper. This upload
 * button usually sits inside a short dropzone card, and an absolute popover
 * below it (with 3 disabled rows + a divider + the URL button/input) reliably
 * ran past the bottom of that card into whatever section follows, getting
 * clipped by it — cutting off the Web Address option entirely. `fixed`
 * isn't confined by any ancestor's layout or overflow, so the full menu
 * always renders in front, regardless of where the trigger sits on the page.
 */
export function UploadSourceMenu({ onFile }: { onFile: (file: File) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function reposition() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      // Right-align to the trigger, but never let the menu run past the left
      // edge of the viewport on narrow screens.
      const left = Math.max(8, rect.right - MENU_WIDTH);
      setPos({ top: rect.bottom + 4, left });
    }
    reposition();

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
        setShowUrlInput(false);
        setError("");
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  async function fetchFromUrl() {
    const trimmed = url.trim();
    if (!trimmed) return;
    setFetching(true);
    setError("");
    try {
      const response = await fetch(trimmed);
      if (!response.ok) throw new Error(String(response.status));
      const blob = await response.blob();
      const filename = decodeURIComponent(trimmed.split("/").pop()?.split("?")[0] || "download.pdf");
      onFile(new File([blob], filename, { type: blob.type || "application/octet-stream" }));
      setOpen(false);
      setShowUrlInput(false);
      setUrl("");
    } catch {
      setError("Couldn't fetch that file — the site may not allow direct downloads from a browser.");
    } finally {
      setFetching(false);
    }
  }

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen((current) => !current)}
        className="btn btn-primary btn-md rounded-l-none border-l border-primary-content/20 px-2"
        aria-label="Upload from another source"
        title="Upload from another source"
      >
        <ToolIcon name="chevron-down" className="h-4 w-4" />
      </button>

      {open && pos && (
        <div
          ref={menuRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: MENU_WIDTH }}
          className="z-50 rounded-box border border-base-300 bg-base-100 p-1.5 text-left shadow-lg"
        >
          {COMING_SOON_SOURCES.map((source) => (
            <div
              key={source}
              aria-disabled="true"
              title="Coming soon"
              className="flex cursor-not-allowed items-center gap-2 rounded-lg px-3 py-2 text-sm text-base-content/40"
            >
              <ToolIcon name="cloud" className="h-4 w-4" />
              {source}
              <span className="ml-auto text-[10px] tracking-wide uppercase">Soon</span>
            </div>
          ))}

          <div className="my-1 border-t border-base-300" />

          {!showUrlInput ? (
            <button
              type="button"
              onClick={() => setShowUrlInput(true)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-base-200"
            >
              <ToolIcon name="link" className="h-4 w-4" />
              Web Address (URL)
            </button>
          ) : (
            <div className="p-1.5">
              <input
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && fetchFromUrl()}
                placeholder="https://example.com/file.pdf"
                autoFocus
                className="input input-bordered input-sm w-full"
              />
              {error && <p className="mt-1.5 text-xs text-error">{error}</p>}
              <button
                type="button"
                onClick={fetchFromUrl}
                disabled={fetching || !url.trim()}
                className="btn btn-primary btn-sm mt-2 w-full"
              >
                {fetching ? "Fetching..." : "Fetch file"}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
