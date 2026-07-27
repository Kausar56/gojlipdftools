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
      { label: "Extract Pages", description: "Pull out specific pages into a new PDF." },
      { label: "Split by Bookmarks", description: "Break a PDF into files using its bookmark structure." },
      { label: "Split in Half", description: "Divide a PDF into two equal halves." },
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
      { label: "Delete Pages", description: "Remove unwanted pages from a PDF." },
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
      { label: "Flatten", description: "Merge form fields and layers into static page content." },
    ],
  },
  {
    title: "Convert from PDF",
    items: [
      { label: "PDF to Excel", description: "Turn tables in a PDF into an editable spreadsheet." },
      { label: "PDF to JPG", description: "Save each PDF page as a JPG image." },
      { label: "PDF to PowerPoint", description: "Convert PDF pages into editable slides." },
      { label: "PDF to Text", description: "Extract plain text content from a PDF." },
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
      { label: "Bates Numbering", description: "Stamp sequential legal numbering on every page." },
      { label: "Create Bookmarks", description: "Add a navigable outline to a PDF." },
      { label: "Crop", description: "Trim the margins or visible area of PDF pages." },
      { label: "Edit Metadata", description: "Change a PDF's title, author, and other properties." },
      { label: "Extract Images", description: "Save every embedded image out of a PDF." },
      { label: "Flip", description: "Mirror PDF pages horizontally or vertically." },
      { label: "Grayscale", description: "Convert a color PDF to black and white." },
      { label: "Header & Footer", description: "Add running text, page numbers, or dates to every page." },
      { label: "N-up", description: "Print multiple pages onto a single sheet." },
      { label: "Page Numbers", description: "Stamp page numbers onto every page." },
      { label: "Repair", description: "Attempt to fix a corrupted or unreadable PDF." },
      { label: "Resize", description: "Change the page size of a PDF." },
      { label: "Rotate PDF", slug: "rotate-pdf" },
      { label: "Remove Annotations", description: "Strip comments, highlights, and markup from a PDF." },
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
