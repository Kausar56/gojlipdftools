// Keeps public/pdf.worker.real.js in sync with the installed pdfjs-dist
// version — a mismatch here breaks PDF rendering everywhere (pdf.js checks
// that the main-thread library version matches the worker version). Runs
// automatically on every `npm install` (see package.json's "postinstall"),
// so a routine dependency bump (including security fixes like the one that
// originally caused this drift) can never silently leave a stale worker
// file behind again.
import { copyFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const dest = path.join(root, "public", "pdf.worker.real.js");

copyFileSync(src, dest);

const { version } = JSON.parse(readFileSync(path.join(root, "node_modules", "pdfjs-dist", "package.json"), "utf8"));
console.log(`Synced public/pdf.worker.real.js from pdfjs-dist@${version}`);
