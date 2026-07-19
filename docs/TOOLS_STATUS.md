# PDFFlow — Tool Status (internal)

This file is for developers working on this repo. It's not linked from the site and isn't
rendered anywhere (Next.js only routes `app/`, so a root-level `docs/` folder is never public).
Keep it updated whenever a tool's status changes.

## Legend

- ✅ **Live** — real functionality, verified end-to-end (built + manually driven in a browser).
- ⚠️ **Wired but broken** — has a real `*Workspace` component plugged in via `workspace={...}`,
  but the underlying tech doesn't actually work yet. Looks live in the UI; isn't.
- ⏳ **Not started** — still using the generic `UploadDropzone` placeholder with a disabled
  "Coming soon" action button. Honest placeholder, not broken.

## Summary

| Tool | Slug | Status | Runs on | Stack |
|---|---|---|---|---|
| Edit PDF | `edit-pdf` | ✅ Live | Browser | pdf.js (render + text detect) + pdf-lib (save) |
| Merge PDF | `merge-pdf` | ✅ Live | Browser | pdf-lib |
| Split PDF | `split-pdf` | ✅ Live | Browser | pdf-lib |
| Compress PDF | `compress-pdf` | ✅ Live (basic) | Browser | pdf-lib + Canvas (JPEG re-encode + DPI downsample) |
| JPG to PDF | `jpg-to-pdf` | ✅ Live | Browser | pdf-lib |
| Rotate PDF | `rotate-pdf` | ✅ Live | Browser | pdf-lib |
| Watermark PDF | `watermark-pdf` | ✅ Live | Browser | pdf-lib |
| PDF Password Protect | `protect-pdf` | ✅ Live | Browser | `@pdfsmaller/pdf-encrypt` (Web Crypto API) |
| Unlock PDF | `unlock-pdf` | ✅ Live | Browser | `@pdfsmaller/pdf-decrypt` (Web Crypto API) |
| PDF to Word | `pdf-to-word` | ⏳ Not started | Server (planned) | needs LibreOffice or similar |
| Word to PDF | `word-to-pdf` | ⏳ Not started | Server (planned) | needs LibreOffice or similar |
| Excel to PDF | `excel-to-pdf` | ⏳ Not started | Server (planned) | needs LibreOffice or similar |
| PPT to PDF | `ppt-to-pdf` | ⏳ Not started | Server (planned) | needs LibreOffice or similar |

**9 live, 4 not started**, out of 13 tools.

---

## ✅ Edit PDF — `app/edit-pdf/page.tsx`, `components/PdfEditorWorkspace.tsx`

The most advanced tool. Renders real PDF pages with pdf.js, lets the user add/edit content, saves
with pdf-lib.

- **Rendering**: `pdfjs-dist`, worker file manually copied to `public/pdf.worker.min.mjs` (not
  auto-synced on `npm install` — re-copy from `node_modules/pdfjs-dist/build/` if pdfjs-dist is
  upgraded).
- **Tools**: Select (drag to move / resize), Text, Draw (freehand), Shapes (rectangle / circle /
  line via `shapeType` sub-picker), Image, Highlight, Signature (drawing pad, rasterized to PNG),
  Erase.
- **Resize**: corner handle. For text it scales `fontSizePt` (not just box width — see git history,
  this was a real bug fix after user feedback that text "resize" wasn't doing anything visible).
- **Color**: 4 theme swatches + a native `<input type="color">` custom picker
  (`activeColorHex` state, see `lib/colorSwatches.ts`).
- **Undo/Redo**: `past`/`future` stacks of full `elements[]` snapshots. Pushed once per discrete
  action (add/remove/drag-start/resize-start/textarea-focus), not per keystroke/per mousemove.
- **In-place text edit** (the "like Sejda" feature): uses `page.getTextContent()` from pdf.js to
  find existing text runs, lets the user click one to mask it with a white rectangle and draw
  replacement text at the same baseline. **This does not rewrite the PDF's content stream** — no
  browser tool can reliably do that. It only works for axis-aligned (non-rotated) text, assumes a
  white page background, and re-draws with Helvetica regardless of the original font.
- **Known gaps**: no resize for `path`/`line` via the erase tool (only Undo removes them); signature
  pad is basic freehand only (no typed/cursive option).

## ✅ Merge PDF / Split PDF / Rotate PDF / Watermark PDF / JPG to PDF

Straightforward pdf-lib operations. Each has its own `*Workspace.tsx` component in `components/`.

- **Split PDF** and **Rotate PDF** share page-range parsing logic: `lib/pageRanges.ts`
  (`parsePageGroups` / `parsePageList`). Reuse this instead of re-implementing range parsing for
  any future tool that needs "1-3, 5, 8-10" style input.
- **Watermark PDF** reuses `lib/colorSwatches.ts` (same custom-color pattern as the editor).
- **JPG to PDF** shows real thumbnail previews via `URL.createObjectURL` — remember these get
  revoked on unmount/remove (see the `itemsRef`/`downloadUrlRef` pattern in
  `JpgToPdfWorkspace.tsx` — a real bug was fixed here: the original `useEffect` cleanup closure
  captured stale state).

## ✅ Compress PDF (basic) — `components/CompressPdfWorkspace.tsx`

Client-side only. Three levels (Low / Recommended / Extreme) combine a JPEG quality setting with a
target-DPI cap; images are decoded via `createImageBitmap`, redrawn on a `<canvas>` at the capped
pixel size, and re-encoded with `canvas.toBlob(..., 'image/jpeg', quality)`.

**Real bugs found and fixed while building this (worth knowing if touching this file again):**
1. Shared images (same image object referenced by multiple pages) were being recompressed and
   re-embedded once *per page reference* instead of once — inflating file size. Fixed with a
   `Map<refKey, newRef>` cache.
2. pdf-lib does **not** garbage-collect orphaned objects on `save()`. Replacing an image reference
   without calling `doc.context.delete(oldRef)` left the old (large) image byte-for-byte in the
   saved file — net result was the "compressed" file being *larger* than the original. Always
   delete the old ref after replacing it.

**Limitations**: only recompresses images with a `/DCTDecode` (JPEG) filter. PNG/Flate-encoded
images and font subsetting are untouched — a Ghostscript-style pass would do much better across
the board.

## ✅ PDF Password Protect / Unlock PDF — `ProtectPdfWorkspace.tsx` / `UnlockPdfWorkspace.tsx`

**History**: first attempt was `qpdf-wasm` (qpdf's CLI compiled to WASM) — abandoned. It needs
`SharedArrayBuffer`/cross-origin isolation for its internal pthread pool; the initial module load
worked but qpdf's attempt to spawn its worker thread pool got blocked
(`ERR_BLOCKED_BY_RESPONSE`) specifically when bundled into a real component (a standalone test page
worked fine). Two standard fixes (COOP/COEP headers, Emscripten's `mainScriptUrlOrBlob`) didn't
resolve it, and the deploy target being **Vercel** ruled out shelling out to a native `qpdf` binary
anyway (no persistent OS install on serverless). `muhammara` (native addon) was also checked and
its docs have no mention of encryption support — not viable.

**Resolved with `@pdfsmaller/pdf-encrypt` + `@pdfsmaller/pdf-decrypt`** — pure JS, zero
dependencies (peer dep on `pdf-lib`, which we already have), built on the **Web Crypto API**
(`crypto.subtle`) instead of WASM/threads, so none of the above problems apply. Supports AES-256
(default, PDF 2.0 / V=5 R=6) and legacy RC4-128.

- `encryptPDF(bytes, userPassword, options?)` → `Promise<Uint8Array>`. `options.ownerPassword` and
  granular `allow*` permission flags exist but aren't exposed in our UI yet (only a single password
  is collected) — see the package's README if that's ever needed.
- `decryptPDF(bytes, password)` → `Promise<Uint8Array>`, throws `Error("Incorrect password. ...")`
  on a bad password — matched with `.includes("Incorrect password")`, not exact equality (the
  real thrown message is longer than just "Incorrect password").
- `isEncrypted(bytes)` → `{ encrypted, algorithm, version, revision, keyLength }`, available if a
  nicer "this PDF isn't password protected" message is ever wanted on the Unlock page (not
  currently used).

**Verified**: encrypted output confirmed as real AES-256 (`isEncrypted()` *and* independently by
`pdf-lib` refusing to `PDFDocument.load()` it without `ignoreEncryption: true`), wrong password
correctly rejected, correct password produces a valid PDF that `pdf-lib` re-opens with the right
page count.

**Cleaned up**: `lib/qpdf.ts`, `public/qpdf/*`, and the COOP/COEP/CORP headers in
`next.config.ts` were all removed — none of it is needed anymore. `next.config.ts` is back to
default.

## ⏳ PDF to Word / Word to PDF / Excel to PDF / PPT to PDF

Not started. All four need a real document-conversion engine (LibreOffice headless is the standard
open-source choice; paid APIs like Adobe/Aspose/CloudConvert are the alternative). Same Vercel
constraint as above applies — LibreOffice is not installable on Vercel serverless without a custom
container. Likely needs a separate always-on service (Railway/Render/Fly.io/a VPS) rather than a
Vercel API route, with the Next.js app calling out to it.

---

## Architecture reference

- **`lib/tools.ts`** — single source of truth for every tool's name, slug, category
  (`core`/`convert`), hero copy, steps, FAQs, icon, accent color. Homepage grid, footer, and
  mega menu all derive from this — add a tool here first.
- **`lib/megaMenu.ts`** — categorized nav dropdown; items with a `slug` matching a real tool
  become clickable links, everything else renders as a disabled "Soon" row.
- **`components/ToolPageLayout.tsx`** — shared page shell (breadcrumb, hero, steps, FAQ). Accepts
  an optional `workspace` prop; omit it and you get the default `UploadDropzone` "Coming soon"
  placeholder for free. This is *the* pattern for turning a placeholder into a real tool.
- **Client vs. server split** (see memory `project-pdf-processing-architecture` from earlier
  sessions): browser-doable work stays in the browser; genuinely server-only work goes server-side.
  Always prefer client-side unless something concrete blocks it — PDF encryption looked like a
  server-only problem (see the qpdf-wasm history above) but turned out to have a pure-JS/Web-Crypto
  answer once we stopped assuming "encryption library" implies "native binary or WASM threads". The
  remaining server-only case is Office conversion (`pdf-to-word`, `word-to-pdf`, `excel-to-pdf`,
  `ppt-to-pdf`) — LibreOffice genuinely has no browser or pure-JS equivalent.
- **Bangla localization**: still not started. The whole site is English-only; this was an original
  project goal that got deprioritized while building out tool functionality.
