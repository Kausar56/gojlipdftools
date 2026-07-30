/**
 * Every tool dynamically imports its heavy libraries (`pdf-lib`, `pdfjs-dist`,
 * `tesseract.js`) at the moment the user clicks the action button — normal
 * and good for initial page-load size, but it means that action is exactly
 * when a stale deployment bites: if a new build has gone out since this tab
 * loaded, the browser's copy of the app is still asking for an old chunk
 * filename that no longer exists on the server (chunk filenames are
 * content-hashed, so every deploy that touches a chunk renames it), and the
 * import rejects with a ChunkLoadError. Retrying without reloading the page
 * fails the same way every time, since the tab's module cache is what's
 * stale, not the network — so the fix here isn't a better error message
 * about *this* PDF, it's telling the user to reload so their tab picks up
 * the current deployment.
 */
function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === "ChunkLoadError" || /Failed to load chunk|Loading chunk .* failed/i.test(error.message);
}

/** Wrap the existing `error instanceof Error ? ... : ...` fallback message —
 *  swaps in a "please refresh" message specifically for chunk-load failures,
 *  otherwise passes the fallback straight through unchanged. */
export function describeError(error: unknown, fallback: string): string {
  if (isChunkLoadError(error)) {
    return "A new version of Gojli was deployed after this page loaded. Please refresh the page (Ctrl+Shift+R) and try again.";
  }
  return fallback;
}
