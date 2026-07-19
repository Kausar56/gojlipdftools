export type ToolAccent = "primary" | "secondary" | "accent";
export type ToolCategory = "core" | "convert";

export type ToolFaq = {
  question: string;
  answer: string;
};

export type Tool = {
  slug: string;
  name: string;
  shortDescription: string;
  heroDescription: string;
  accent: ToolAccent;
  category: ToolCategory;
  icon: string;
  accept: string;
  steps: string[];
  faqs: ToolFaq[];
};

export const tools: Tool[] = [
  {
    slug: "edit-pdf",
    name: "Edit PDF",
    shortDescription: "Add text, drawings, shapes, and images directly onto your PDF.",
    heroDescription:
      "Open your PDF in a full editor and add text, freehand drawings, shapes, images, and highlights straight onto the page — no converting back and forth.",
    accent: "primary",
    category: "core",
    icon: "edit-pdf",
    accept: "application/pdf",
    steps: [
      "Upload the PDF you want to edit.",
      "Pick a tool — text, draw, shapes, image, or highlight — and place it on the page.",
      "Download your edited PDF.",
    ],
    faqs: [
      { question: "Can I edit the original text in the PDF?", answer: "This tool adds new content on top of the page rather than rewriting existing text — for that, use PDF to Word." },
      { question: "Can I edit more than one page?", answer: "Yes, you'll be able to move between pages and edit each one independently." },
    ],
  },
  {
    slug: "merge-pdf",
    name: "Merge PDF",
    shortDescription: "Combine multiple PDFs into a single file, in the order you choose.",
    heroDescription:
      "Combine multiple PDF files into one document. Reorder pages, drop in as many files as you need, and download a single merged PDF.",
    accent: "primary",
    category: "core",
    icon: "merge",
    accept: "application/pdf",
    steps: [
      "Upload two or more PDF files.",
      "Drag to reorder the files the way you want them combined.",
      "Click Merge and download your single PDF.",
    ],
    faqs: [
      { question: "Is there a limit to how many PDFs I can merge?", answer: "No, you can combine as many PDF files as you need into one document." },
      { question: "Will the page order be preserved?", answer: "Yes, pages stay in their original order within each file, and you control the order files are combined in." },
    ],
  },
  {
    slug: "split-pdf",
    name: "Split PDF",
    shortDescription: "Extract pages or break one PDF into several smaller files.",
    heroDescription:
      "Split a PDF into separate files by page range, or pull out individual pages you need without touching the rest of the document.",
    accent: "secondary",
    category: "core",
    icon: "split",
    accept: "application/pdf",
    steps: [
      "Upload the PDF you want to split.",
      "Choose page ranges or select individual pages to extract.",
      "Click Split and download the resulting files.",
    ],
    faqs: [
      { question: "Can I extract just one page from a PDF?", answer: "Yes, you can select a single page or any combination of pages to extract as a new PDF." },
      { question: "Does splitting reduce quality?", answer: "No, splitting only separates pages — it doesn't recompress or alter their content." },
    ],
  },
  {
    slug: "compress-pdf",
    name: "Compress PDF",
    shortDescription: "Shrink PDF file size while keeping the document readable.",
    heroDescription:
      "Reduce the file size of your PDF so it's easier to email or upload, while keeping text sharp and images as clear as possible.",
    accent: "accent",
    category: "core",
    icon: "compress",
    accept: "application/pdf",
    steps: [
      "Upload the PDF you want to shrink.",
      "Pick a compression level based on quality vs. file size.",
      "Download your smaller PDF.",
    ],
    faqs: [
      { question: "How much smaller will my file get?", answer: "It depends on the content — PDFs with lots of images usually shrink the most." },
      { question: "Will compressing hurt text quality?", answer: "Text stays sharp; compression mainly targets embedded images." },
    ],
  },
  {
    slug: "pdf-to-word",
    name: "PDF to Word",
    shortDescription: "Convert a PDF into an editable Word document.",
    heroDescription:
      "Turn a PDF into an editable .docx file, keeping paragraphs, headings, and layout as close to the original as possible.",
    accent: "primary",
    category: "convert",
    icon: "pdf-to-word",
    accept: "application/pdf",
    steps: [
      "Upload the PDF you want to convert.",
      "Wait while it's converted into an editable format.",
      "Download your Word document.",
    ],
    faqs: [
      { question: "Will the formatting stay the same?", answer: "We keep layout, fonts, and images as close to the original PDF as the format allows." },
      { question: "Can I edit the file afterwards?", answer: "Yes, the output is a standard .docx file you can open and edit in Word or similar apps." },
    ],
  },
  {
    slug: "word-to-pdf",
    name: "Word to PDF",
    shortDescription: "Turn a Word document into a shareable, universal PDF.",
    heroDescription:
      "Convert .doc or .docx files into PDF so your document looks the same on every device, without needing Word installed.",
    accent: "secondary",
    category: "convert",
    icon: "word-to-pdf",
    accept: ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    steps: [
      "Upload your Word document (.doc or .docx).",
      "Wait while it's converted to PDF.",
      "Download your PDF file.",
    ],
    faqs: [
      { question: "Do fonts stay consistent?", answer: "Yes, converting to PDF locks in fonts and layout so the file looks the same everywhere." },
      { question: "Can I convert multiple Word files at once?", answer: "Yes, you can upload several files and convert them together." },
    ],
  },
  {
    slug: "excel-to-pdf",
    name: "Excel to PDF",
    shortDescription: "Convert spreadsheets into clean, print-ready PDFs.",
    heroDescription:
      "Turn .xls or .xlsx spreadsheets into a PDF that's easy to share and print, with rows and columns laid out cleanly.",
    accent: "accent",
    category: "convert",
    icon: "excel-to-pdf",
    accept: ".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    steps: [
      "Upload your Excel file (.xls or .xlsx).",
      "Wait while it's converted to PDF.",
      "Download your PDF file.",
    ],
    faqs: [
      { question: "Will large spreadsheets fit on the page?", answer: "Sheets are scaled to fit standard page sizes, split across pages if needed." },
      { question: "Are multiple sheet tabs supported?", answer: "Yes, every sheet in the workbook is included in the output PDF." },
    ],
  },
  {
    slug: "ppt-to-pdf",
    name: "PPT to PDF",
    shortDescription: "Turn a slide deck into a PDF anyone can open.",
    heroDescription:
      "Convert .ppt or .pptx presentations into a PDF, so your slides look right for anyone, even without PowerPoint.",
    accent: "primary",
    category: "convert",
    icon: "ppt-to-pdf",
    accept: ".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation",
    steps: [
      "Upload your presentation (.ppt or .pptx).",
      "Wait while it's converted to PDF.",
      "Download your PDF file.",
    ],
    faqs: [
      { question: "Do animations and transitions carry over?", answer: "PDF is a static format, so each slide becomes a single page without animations." },
      { question: "Will slide design stay the same?", answer: "Yes, layout, images, and text keep their original look." },
    ],
  },
  {
    slug: "jpg-to-pdf",
    name: "JPG to PDF",
    shortDescription: "Turn one or more images into a clean, shareable PDF.",
    heroDescription:
      "Convert JPG, PNG, or other image files into a single PDF document. Great for scanned pages, receipts, or photos you need to share as one file.",
    accent: "secondary",
    category: "convert",
    icon: "image-to-pdf",
    accept: "image/jpeg,image/png",
    steps: [
      "Upload one or more image files.",
      "Arrange them in the order you want them to appear.",
      "Click Convert and download your PDF.",
    ],
    faqs: [
      { question: "Which image formats are supported?", answer: "JPG and PNG are supported, with more formats planned." },
      { question: "Can I combine several images into one PDF?", answer: "Yes, each image becomes its own page in the final PDF, in the order you set." },
    ],
  },
  {
    slug: "protect-pdf",
    name: "PDF Password Protect",
    shortDescription: "Lock a PDF with a password so only the right people can open it.",
    heroDescription:
      "Add a password to your PDF so it can't be opened without the right credentials — useful for sharing sensitive documents.",
    accent: "accent",
    category: "core",
    icon: "protect-pdf",
    accept: "application/pdf",
    steps: [
      "Upload the PDF you want to protect.",
      "Set a password for opening the file.",
      "Download your password-protected PDF.",
    ],
    faqs: [
      { question: "What if I forget the password?", answer: "The password can't be recovered, so keep it somewhere safe once you set it." },
      { question: "Can I also restrict printing or editing?", answer: "Yes, permission controls for printing and editing are planned alongside the password option." },
    ],
  },
  {
    slug: "unlock-pdf",
    name: "Unlock PDF",
    shortDescription: "Remove a password from a PDF you have the right to access.",
    heroDescription:
      "Remove password protection from a PDF you own or are authorized to access, so it opens without a prompt every time.",
    accent: "primary",
    category: "core",
    icon: "unlock-pdf",
    accept: "application/pdf",
    steps: [
      "Upload the password-protected PDF.",
      "Enter the current password.",
      "Download the unlocked PDF.",
    ],
    faqs: [
      { question: "Do I need the original password?", answer: "Yes, you must know the current password to remove it." },
      { question: "Is this safe to use on shared documents?", answer: "Only unlock documents you own or have permission to access." },
    ],
  },
  {
    slug: "rotate-pdf",
    name: "Rotate PDF",
    shortDescription: "Fix sideways or upside-down pages in a PDF.",
    heroDescription:
      "Rotate one page or every page in a PDF to the correct orientation, so nothing reads sideways or upside down.",
    accent: "secondary",
    category: "core",
    icon: "rotate-pdf",
    accept: "application/pdf",
    steps: [
      "Upload the PDF you want to fix.",
      "Select the pages and rotate them 90, 180, or 270 degrees.",
      "Download your corrected PDF.",
    ],
    faqs: [
      { question: "Can I rotate just one page?", answer: "Yes, you can rotate individual pages or apply the same rotation to the whole document." },
      { question: "Is the rotation permanent in the file?", answer: "Yes, the new orientation is saved directly into the downloaded PDF." },
    ],
  },
  {
    slug: "watermark-pdf",
    name: "Watermark PDF",
    shortDescription: "Stamp text or a logo across your PDF pages.",
    heroDescription:
      "Add a text or image watermark across every page of your PDF — useful for marking drafts, confidential files, or branding documents.",
    accent: "accent",
    category: "core",
    icon: "watermark-pdf",
    accept: "application/pdf",
    steps: [
      "Upload the PDF you want to watermark.",
      "Type your watermark text or upload a logo, and set its position.",
      "Download your watermarked PDF.",
    ],
    faqs: [
      { question: "Can I control the watermark's opacity?", answer: "Yes, you'll be able to adjust transparency so it doesn't obscure the content." },
      { question: "Does it apply to every page?", answer: "Yes, by default it's stamped on every page, though page-range control is planned." },
    ],
  },
];

export function getToolBySlug(slug: string): Tool | undefined {
  return tools.find((tool) => tool.slug === slug);
}
