/**
 * pdfjs-dist 6.2+ calls the brand-new `Map.prototype.getOrInsertComputed`/
 * `getOrInsert` (a very recent JS engine addition) directly in its own
 * rendering/font code, with no fallback — on any browser that doesn't have
 * it yet, that throws `... is not a function` deep inside pdf.js's internal
 * promise chains, silently breaking rendering (the page just never appears,
 * with no visible error) instead of a clean failure. Polyfilling here, on
 * the main thread, covers every consumer of loadPdfjs(); the worker thread
 * needs its own copy since a Worker has its own separate global scope — see
 * the wrapper prepended in public/pdf.worker.min.js.
 */
function installMapPolyfills() {
  const proto = Map.prototype as unknown as {
    getOrInsertComputed?: (key: unknown, callback: (key: unknown) => unknown) => unknown;
    getOrInsert?: (key: unknown, value: unknown) => unknown;
  };
  if (typeof proto.getOrInsertComputed !== "function") {
    proto.getOrInsertComputed = function (this: Map<unknown, unknown>, key, callback) {
      if (this.has(key)) return this.get(key);
      const value = callback(key);
      this.set(key, value);
      return value;
    };
  }
  if (typeof proto.getOrInsert !== "function") {
    proto.getOrInsert = function (this: Map<unknown, unknown>, key, value) {
      if (this.has(key)) return this.get(key);
      this.set(key, value);
      return value;
    };
  }
}

export async function loadPdfjs() {
  installMapPolyfills();
  const pdfjs = await import("pdfjs-dist");
  // Served as .js, not pdfjs-dist's native .mjs — pdf.js always constructs
  // this as `new Worker(workerSrc, { type: "module" })` (module-ness comes
  // from that option, not the URL's extension), but some hosts (e.g.
  // Hostinger's LiteSpeed) have no default MIME mapping for .mjs and serve
  // it as text/plain, which browsers refuse to import as a module. .js gets
  // the standard text/javascript MIME type from virtually every server.
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
  return pdfjs;
}
