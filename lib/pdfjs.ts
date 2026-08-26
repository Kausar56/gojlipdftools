export async function loadPdfjs() {
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
