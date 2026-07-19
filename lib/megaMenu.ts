export type MegaMenuItem = {
  label: string;
  slug?: string;
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
      { label: "Alternate & Mix" },
      { label: "Organize" },
    ],
  },
  {
    title: "Split",
    items: [
      { label: "Split PDF", slug: "split-pdf" },
      { label: "Extract Pages" },
      { label: "Split by Bookmarks" },
      { label: "Split in Half" },
      { label: "Split by Size" },
      { label: "Split by Text" },
    ],
  },
  {
    title: "Edit & Sign",
    items: [
      { label: "Edit PDF", slug: "edit-pdf" },
      { label: "Fill & Sign" },
      { label: "Create Forms" },
      { label: "Delete Pages" },
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
      { label: "Flatten" },
    ],
  },
  {
    title: "Convert from PDF",
    items: [
      { label: "PDF to Excel" },
      { label: "PDF to JPG" },
      { label: "PDF to PowerPoint" },
      { label: "PDF to Text" },
      { label: "PDF to Word", slug: "pdf-to-word" },
    ],
  },
  {
    title: "Convert to PDF",
    items: [
      { label: "HTML to PDF" },
      { label: "JPG to PDF", slug: "jpg-to-pdf" },
      { label: "Word to PDF", slug: "word-to-pdf" },
      { label: "Excel to PDF", slug: "excel-to-pdf" },
      { label: "PPT to PDF", slug: "ppt-to-pdf" },
    ],
  },
  {
    title: "Other",
    items: [
      { label: "Bates Numbering" },
      { label: "Create Bookmarks" },
      { label: "Crop" },
      { label: "Edit Metadata" },
      { label: "Extract Images" },
      { label: "Flip" },
      { label: "Grayscale" },
      { label: "Header & Footer" },
      { label: "N-up" },
      { label: "Page Numbers" },
      { label: "Repair" },
      { label: "Resize" },
      { label: "Rotate PDF", slug: "rotate-pdf" },
      { label: "Remove Annotations" },
    ],
  },
  {
    title: "Scans",
    items: [{ label: "Deskew" }, { label: "OCR" }],
  },
];
