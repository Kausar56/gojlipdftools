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
    title: "AI Tools",
    items: [{ label: "AI Summarize", slug: "ai-summarize" }],
  },
  {
    title: "Merge",
    items: [
      { label: "Merge PDF", slug: "merge-pdf" },
      { label: "Alternate & Mix", slug: "alternate-mix" },
      { label: "Organize", slug: "organize" },
    ],
  },
  {
    title: "Split",
    items: [
      { label: "Split PDF", slug: "split-pdf" },
      // Both are just Split PDF used a specific way (one range group, or the
      // built-in "Split in Half" shortcut already in that tool) — pointing
      // them at the same slug instead of building near-duplicate tools.
      { label: "Extract Pages", slug: "split-pdf", description: "Pull out specific pages into their own new PDF." },
      { label: "Split by Bookmarks", slug: "split-by-bookmarks" },
      { label: "Split in Half", slug: "split-pdf", description: "Divide a PDF into two equal halves in one click." },
      { label: "Split by Size", slug: "split-by-size" },
      { label: "Split by Text", slug: "split-by-text" },
    ],
  },
  {
    title: "Edit & Sign",
    items: [
      { label: "Edit PDF", slug: "edit-pdf" },
      { label: "Fill & Sign", slug: "fill-sign" },
      { label: "Create Forms", slug: "create-forms" },
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
      { label: "PDF to Excel", slug: "pdf-to-excel" },
      { label: "PDF to JPG", slug: "pdf-to-jpg" },
      { label: "PDF to PowerPoint", slug: "pdf-to-ppt" },
      { label: "PDF to Text", slug: "pdf-to-text" },
      { label: "PDF to Word", slug: "pdf-to-word" },
    ],
  },
  {
    title: "Convert to PDF",
    items: [
      { label: "HTML to PDF", slug: "html-to-pdf" },
      { label: "JPG to PDF", slug: "jpg-to-pdf" },
      { label: "Word to PDF", slug: "word-to-pdf" },
      { label: "Excel to PDF", slug: "excel-to-pdf" },
      { label: "PPT to PDF", slug: "ppt-to-pdf" },
    ],
  },
  {
    title: "Other",
    items: [
      { label: "Bates Numbering", slug: "bates-numbering" },
      { label: "Create Bookmarks", slug: "create-bookmarks" },
      { label: "Crop", slug: "crop" },
      { label: "Edit Metadata", slug: "edit-metadata" },
      { label: "Extract Images", slug: "extract-images" },
      { label: "Flip", slug: "flip" },
      { label: "Grayscale", slug: "grayscale" },
      { label: "Header & Footer", slug: "header-footer" },
      { label: "N-up", slug: "n-up" },
      { label: "Page Numbers", slug: "page-numbers" },
      { label: "Repair", slug: "repair" },
      { label: "Resize", slug: "resize-pdf" },
      { label: "Rotate PDF", slug: "rotate-pdf" },
      { label: "Remove Annotations", slug: "remove-annotations" },
    ],
  },
  {
    title: "Scans",
    items: [
      { label: "Deskew", slug: "deskew" },
      { label: "OCR", slug: "ocr" },
    ],
  },
];
