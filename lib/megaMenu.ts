export type MegaMenuItem = {
  label: string;
  slug?: string;
  /** Shown on the disabled home-page card for items with no slug yet — tools
   *  that already have a slug pull their description from lib/tools.ts
   *  instead, so this is only ever read for the "Coming soon" ones. */
  description?: string;
};

export type MegaMenuCategory = {
  title: string;
  items: MegaMenuItem[];
};

export const megaMenu: MegaMenuCategory[] = [
  {
    title: "Merge",
    items: [
      { label: "Merge PDF", slug: "merge-pdf" },
      { label: "Alternate & Mix", description: "Interleave pages from two PDFs into one document." },
      { label: "Organize", description: "Reorder, rotate, or delete pages by dragging thumbnails." },
    ],
  },
  {
    title: "Split",
    items: [
      { label: "Split PDF", slug: "split-pdf" },
      // Both are just Split PDF used a specific way (one range group, or the
      // built-in "Split in Half" shortcut already in that tool) — pointing
      // them at the same slug instead of building near-duplicate tools.
      { label: "Extract Pages", slug: "split-pdf" },
      { label: "Split by Bookmarks", description: "Break a PDF into files using its bookmark structure." },
      { label: "Split in Half", slug: "split-pdf" },
      { label: "Split by Size", description: "Split a PDF into parts under a target file size." },
      { label: "Split by Text", description: "Split a PDF wherever matching text appears." },
    ],
  },
  {
    title: "Edit & Sign",
    items: [
      { label: "Edit PDF", slug: "edit-pdf" },
      { label: "Fill & Sign", description: "Fill out form fields and add your signature." },
      { label: "Create Forms", description: "Add fillable text fields, checkboxes, and signatures." },
      { label: "Delete Pages", slug: "delete-pages" },
    ],
  },
  {
    title: "Compress",
    items: [{ label: "Compress PDF", slug: "compress-pdf" }],
  },
  {
    title: "Security",
    items: [
      { label: "PDF Password Protect", slug: "protect-pdf" },
      { label: "Unlock PDF", slug: "unlock-pdf" },
      { label: "Watermark PDF", slug: "watermark-pdf" },
      { label: "Flatten", slug: "flatten-pdf" },
    ],
  },
  {
    title: "Convert from PDF",
    items: [
      { label: "PDF to Excel", description: "Turn tables in a PDF into an editable spreadsheet." },
      { label: "PDF to JPG", slug: "pdf-to-jpg" },
      { label: "PDF to PowerPoint", description: "Convert PDF pages into editable slides." },
      { label: "PDF to Text", slug: "pdf-to-text" },
      { label: "PDF to Word", slug: "pdf-to-word" },
    ],
  },
  {
    title: "Convert to PDF",
    items: [
      { label: "HTML to PDF", description: "Turn a web page or HTML file into a PDF." },
      { label: "JPG to PDF", slug: "jpg-to-pdf" },
      { label: "Word to PDF", slug: "word-to-pdf" },
      { label: "Excel to PDF", slug: "excel-to-pdf" },
      { label: "PPT to PDF", slug: "ppt-to-pdf" },
    ],
  },
  {
    title: "Other",
    items: [
      // Same tool, flexible enough to cover both a plain page number and a
      // Bates-style prefix + zero-padded sequence.
      { label: "Bates Numbering", slug: "page-numbers" },
      { label: "Create Bookmarks", description: "Add a navigable outline to a PDF." },
      { label: "Crop", description: "Trim the margins or visible area of PDF pages." },
      { label: "Edit Metadata", slug: "edit-metadata" },
      { label: "Extract Images", description: "Save every embedded image out of a PDF." },
      { label: "Flip", description: "Mirror PDF pages horizontally or vertically." },
      { label: "Grayscale", description: "Convert a color PDF to black and white." },
      { label: "Header & Footer", slug: "header-footer" },
      { label: "N-up", description: "Print multiple pages onto a single sheet." },
      { label: "Page Numbers", slug: "page-numbers" },
      { label: "Repair", description: "Attempt to fix a corrupted or unreadable PDF." },
      { label: "Resize", slug: "resize-pdf" },
      { label: "Rotate PDF", slug: "rotate-pdf" },
      { label: "Remove Annotations", slug: "remove-annotations" },
    ],
  },
  {
    title: "Scans",
    items: [
      { label: "Deskew", description: "Straighten crooked scanned pages." },
      { label: "OCR", slug: "ocr" },
    ],
  },
];
