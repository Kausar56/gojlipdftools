export type ToolAccent = "primary" | "secondary" | "accent";
export type ToolCategory = "core" | "convert";

export type ToolFaq = {
  question: string;
  answer: string;
};

export type ToolGuideStep = {
  title: string;
  description: string;
  /** Optional screenshot for this step — add a path under /public and set it here once ready. */
  imageSrc?: string;
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
  guideIntro: string;
  guideSteps: ToolGuideStep[];
  faqs: ToolFaq[];
};

export const tools: Tool[] = [
  {
    slug: "edit-pdf",
    name: "Edit PDF",
    shortDescription: "Add text, drawings, shapes, and images directly onto your PDF.",
    heroDescription: "Add text, drawings, shapes, and images directly onto your PDF.",
    accent: "primary",
    category: "core",
    icon: "edit-pdf",
    accept: "application/pdf",
    guideIntro:
      "Editing a PDF doesn't have to mean retyping the whole document. Gojli's Edit PDF tool lets you add text, shapes, images, and highlights directly onto your file, right in the browser, so you can mark up contracts, forms, and reports in minutes.",
    guideSteps: [
      {
        title: "Upload your PDF",
        description:
          "Choose the PDF you want to edit from your device, or drag and drop it into the editor. The file opens instantly and never leaves your browser, so there's no upload wait and no privacy risk.",
      },
      {
        title: "Add text, shapes, or images",
        description:
          "Pick a tool from the toolbar — Text, Draw, Shapes, Image, or Highlight — and click anywhere on the page to place it. You can also click existing text to edit it in place, resize elements, and choose any color.",
      },
      {
        title: "Save and download",
        description:
          "Once your edits look right, click Save PDF. Gojli builds the updated file locally and gives you a direct download link — no account, no watermark, no waiting on a server.",
      },
    ],
    faqs: [
      { question: "Can I edit the original text in the PDF?", answer: "This tool adds new content on top of the page rather than rewriting existing text — for that, use PDF to Word." },
      { question: "Can I edit more than one page?", answer: "Yes, you'll be able to move between pages and edit each one independently." },
    ],
  },
  {
    slug: "fill-sign",
    name: "Fill & Sign",
    shortDescription: "Fill out form fields and add your signature.",
    heroDescription: "Fill out a PDF and add your signature, ready to send back.",
    accent: "primary",
    category: "core",
    icon: "signature",
    accept: "application/pdf",
    guideIntro:
      "Need to fill out a form and sign it without printing anything? Gojli's Fill & Sign tool lets you drop text, checkmarks, dates, and a hand-drawn signature anywhere on a PDF, right in your browser.",
    guideSteps: [
      { title: "Upload your PDF", description: "Choose the form or document you need to fill out and sign." },
      {
        title: "Add text, checkmarks, and your signature",
        description: "Use the toolbar to add text, today's date, a checkmark, or draw your signature — then drag each one into place on the page.",
      },
      {
        title: "Save and download",
        description: "Once everything's in place, save the PDF and download it, ready to send back.",
      },
    ],
    faqs: [
      { question: "Can I sign more than one page?", answer: "Yes, move between pages and add text, checkmarks, or your signature to any of them." },
      { question: "Do I need to draw my signature every time?", answer: "You'll draw it once per session — each additional signature you add reuses the same drawing." },
    ],
  },
  {
    slug: "create-forms",
    name: "Create Forms",
    shortDescription: "Add fillable text fields, checkboxes, and signatures.",
    heroDescription: "Add real, fillable form fields to a PDF.",
    accent: "primary",
    category: "core",
    icon: "checkbox",
    accept: "application/pdf",
    guideIntro:
      "Turn a static PDF into a form other people can actually fill out — Gojli's Create Forms tool adds real interactive fields (not just visual stamps) that work in Adobe Acrobat, Preview, and browser PDF viewers.",
    guideSteps: [
      { title: "Upload your PDF", description: "Choose the PDF you want to turn into a fillable form." },
      {
        title: "Add and place fields",
        description: "Add text fields, checkboxes, or a signature field, then drag them into place and resize as needed.",
      },
      {
        title: "Create and download",
        description: "Gojli writes real AcroForm fields into the PDF and gives you a direct download link.",
      },
    ],
    faqs: [
      { question: "Will people be able to actually type into these fields?", answer: "Yes, these are real interactive form fields, not static text — anyone opening the PDF in Acrobat, Preview, or most browsers can fill them in." },
      { question: "Is the signature field a real e-signature?", answer: "No — it's a text field labeled for a typed signature. Creating a real cryptographic signature field isn't something this tool supports." },
      { question: "Can I rename a field?", answer: "Yes, each added field has an editable name shown below the page preview." },
    ],
  },
  {
    slug: "merge-pdf",
    name: "Merge PDF",
    shortDescription: "Combine multiple PDFs into a single file, in the order you choose.",
    heroDescription: "Combine multiple PDF files into one document, in order.",
    accent: "primary",
    category: "core",
    icon: "merge",
    accept: "application/pdf",
    guideIntro:
      "Need to combine invoices, reports, or scanned pages into one file? Gojli's Merge PDF tool joins multiple PDFs into a single document in seconds, with full control over the page order.",
    guideSteps: [
      {
        title: "Upload your PDF files",
        description:
          "Select two or more PDF files from your device or drag them into the drop zone. There's no limit on how many files you can combine at once.",
      },
      {
        title: "Arrange the file order",
        description:
          "Drag each file up or down until they're in the order you want them to appear in the final document. Pages inside each file stay in their original sequence.",
      },
      {
        title: "Merge and download",
        description:
          "Click Merge PDF and your combined document is built instantly in your browser. Download the single merged PDF right away — nothing is uploaded to a server.",
      },
    ],
    faqs: [
      { question: "Is there a limit to how many PDFs I can merge?", answer: "No, you can combine as many PDF files as you need into one document." },
      { question: "Will the page order be preserved?", answer: "Yes, pages stay in their original order within each file, and you control the order files are combined in." },
    ],
  },
  {
    slug: "alternate-mix",
    name: "Alternate & Mix",
    shortDescription: "Interleave pages from two PDFs into one document.",
    heroDescription: "Interleave pages from two PDFs into one document, page by page.",
    accent: "primary",
    category: "core",
    icon: "merge",
    accept: "application/pdf",
    guideIntro:
      "Scanned a double-sided document as two separate one-sided stacks? Gojli's Alternate & Mix tool weaves the pages of two PDFs together — page 1 from the first, page 1 from the second, page 2 from the first, and so on.",
    guideSteps: [
      { title: "Upload both PDFs", description: "Choose the two PDF files you want to interleave." },
      {
        title: "Set the order",
        description: "Pick which document's page comes first in each pair, and reverse the second document's page order if it's a back-side scan.",
      },
      {
        title: "Combine and download",
        description: "Gojli weaves the pages together and gives you a single combined PDF to download.",
      },
    ],
    faqs: [
      { question: "What if the two PDFs have different page counts?", answer: "Interleaving continues until the shorter document runs out, then the rest of the longer document's pages are added at the end." },
      { question: "Why would I reverse the second document's pages?", answer: "When you scan double-sided pages as two separate stacks by flipping the whole stack over, the back-side stack usually comes out in reverse order — reversing it before interleaving fixes that." },
    ],
  },
  {
    slug: "organize",
    name: "Organize",
    shortDescription: "Reorder, rotate, or delete pages by dragging thumbnails.",
    heroDescription: "Reorder, rotate, or delete pages by dragging thumbnails.",
    accent: "primary",
    category: "core",
    icon: "merge",
    accept: "application/pdf",
    guideIntro:
      "Gojli's Organize tool shows every page as a thumbnail you can drag into a new order, rotate, or delete, all before saving a single new PDF.",
    guideSteps: [
      { title: "Upload your PDF", description: "Choose the PDF file whose pages you want to reorganize." },
      {
        title: "Reorder, rotate, or delete pages",
        description: "Drag a page by its grip handle to move it, use the rotate buttons to turn it, or delete pages you don't need.",
      },
      {
        title: "Save your organized PDF",
        description: "Gojli rebuilds the PDF in your new page order and gives you a direct download link.",
      },
    ],
    faqs: [
      { question: "Can I reorder pages on a touchscreen?", answer: "Yes, dragging the grip handle works with touch as well as a mouse." },
      { question: "Can I delete every page?", answer: "No, at least one page must remain in the document." },
    ],
  },
  {
    slug: "split-pdf",
    name: "Split PDF",
    shortDescription: "Extract pages or break one PDF into several smaller files.",
    heroDescription: "Extract pages or break one PDF into several smaller files.",
    accent: "secondary",
    category: "core",
    icon: "split",
    accept: "application/pdf",
    guideIntro:
      "Sometimes you only need a few pages from a larger PDF. Gojli's Split PDF tool lets you pull out individual pages or break a document into several smaller files by page range.",
    guideSteps: [
      {
        title: "Upload the PDF to split",
        description: "Choose the PDF file you want to split. Gojli shows you every page so you can decide exactly what to extract.",
      },
      {
        title: "Choose your page ranges",
        description:
          "Type in page numbers or ranges — like 1-3, 5, 8-10 — or select individual pages to pull out as separate files.",
      },
      {
        title: "Split and download",
        description: "Click Split and download the resulting PDF files individually or as a batch, ready to share or store separately.",
      },
    ],
    faqs: [
      { question: "Can I extract just one page from a PDF?", answer: "Yes, you can select a single page or any combination of pages to extract as a new PDF." },
      { question: "Does splitting reduce quality?", answer: "No, splitting only separates pages — it doesn't recompress or alter their content." },
    ],
  },
  {
    slug: "split-by-bookmarks",
    name: "Split by Bookmarks",
    shortDescription: "Break a PDF into files using its bookmark structure.",
    heroDescription: "Break a PDF into files using its bookmark (outline) structure.",
    accent: "secondary",
    category: "core",
    icon: "split",
    accept: "application/pdf",
    guideIntro:
      "If your PDF already has bookmarks — chapters in an ebook, sections in a report — Gojli's Split by Bookmarks tool uses them to automatically split the file into one PDF per section, no manual page ranges needed.",
    guideSteps: [
      { title: "Upload your PDF", description: "Choose a PDF that has bookmarks (an outline/table of contents) already set." },
      {
        title: "Review the detected bookmarks",
        description: "Gojli reads the top-level bookmarks and shows which page each one starts at.",
      },
      {
        title: "Split and download",
        description: "Click Split by Bookmarks and download each section as its own PDF, individually.",
      },
    ],
    faqs: [
      { question: "What if my PDF has no bookmarks?", answer: "You'll see a message saying none were found — use the plain Split PDF tool to split by page ranges instead." },
      { question: "Does it use nested/sub-bookmarks too?", answer: "Only top-level bookmarks are used as split points — sub-bookmarks stay inside their parent section's file." },
      { question: "What happens to pages before the first bookmark?", answer: "They're kept as their own leading section (e.g. a cover page or table of contents) instead of being dropped." },
    ],
  },
  {
    slug: "split-by-size",
    name: "Split by Size",
    shortDescription: "Split a PDF into parts under a target file size.",
    heroDescription: "Split a PDF into parts that each stay under a target file size.",
    accent: "secondary",
    category: "core",
    icon: "split",
    accept: "application/pdf",
    guideIntro:
      "Need to email a PDF but it's too big to attach? Gojli's Split by Size tool breaks a large PDF into several smaller parts, each kept under a size limit you choose.",
    guideSteps: [
      { title: "Upload your PDF", description: "Choose the large PDF file you want broken into smaller parts." },
      {
        title: "Set a target size",
        description: "Choose a maximum size per part, in MB or KB — for example, to stay under an email attachment limit.",
      },
      {
        title: "Split and download",
        description: "Gojli groups consecutive pages into parts that each stay under your target size, ready to download individually.",
      },
    ],
    faqs: [
      { question: "What if a single page is bigger than my target size?", answer: "A page can't be split further, so that part will be shown as still over the limit — you'll see a warning if this happens." },
      { question: "Do the pages stay in order?", answer: "Yes, each part is a consecutive block of pages in their original order." },
    ],
  },
  {
    slug: "split-by-text",
    name: "Split by Text",
    shortDescription: "Split a PDF wherever matching text appears.",
    heroDescription: "Split a PDF into parts wherever a page contains matching text.",
    accent: "secondary",
    category: "core",
    icon: "split",
    accept: "application/pdf",
    guideIntro:
      "Got a batch of scanned invoices or forms combined into one PDF, each one starting with a recognizable label? Gojli's Split by Text tool scans every page and starts a new file wherever your search text appears.",
    guideSteps: [
      { title: "Upload your PDF", description: "Choose the combined PDF you want split apart." },
      {
        title: "Enter the split text",
        description: "Type the text that marks the start of a new document — e.g. \"INVOICE\" or \"Account Number\".",
      },
      {
        title: "Split and download",
        description: "Gojli scans every page's text and starts a new part wherever it finds a match, ready to download individually.",
      },
    ],
    faqs: [
      { question: "Does this work on scanned (image-only) PDFs?", answer: "Only if the text is already selectable/searchable — run OCR first (see our OCR tool) if it's a plain image scan." },
      { question: "What if my text never appears again after the first page?", answer: "You'll see a message and the whole document is kept as one file, since no split points were found." },
    ],
  },
  {
    slug: "compress-pdf",
    name: "Compress PDF",
    shortDescription: "Shrink PDF file size while keeping the document readable.",
    heroDescription: "Shrink PDF file size while keeping the document readable.",
    accent: "accent",
    category: "core",
    icon: "compress",
    accept: "application/pdf",
    guideIntro:
      "Large PDF files are slow to email and often hit upload size limits. Gojli's Compress PDF tool shrinks file size while keeping text sharp and images clear, so your document stays easy to read.",
    guideSteps: [
      {
        title: "Upload the PDF to shrink",
        description: "Add the PDF you want to compress. Gojli looks at its images and fonts to work out how much it can safely reduce.",
      },
      {
        title: "Pick a compression level",
        description: "Choose Low, Recommended, or Extreme depending on whether you want to prioritize quality or the smallest possible file size.",
      },
      {
        title: "Download your smaller PDF",
        description: "Gojli recompresses embedded images directly in your browser and gives you a smaller file, often 50-80% lighter, ready to download.",
      },
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
    heroDescription: "Convert a PDF into an editable Word document.",
    accent: "primary",
    category: "convert",
    icon: "pdf-to-word",
    accept: "application/pdf",
    guideIntro:
      "Converting a PDF to Word makes it easy to update contracts, resumes, or reports without starting from scratch. Gojli's PDF to Word tool turns your file into an editable .docx document.",
    guideSteps: [
      {
        title: "Upload your PDF",
        description: "Choose the PDF file you want converted into an editable Word document.",
      },
      {
        title: "Let Gojli convert it",
        description:
          "Your file is securely processed and converted, keeping paragraphs, headings, and layout as close to the original as the format allows.",
      },
      {
        title: "Download your Word file",
        description: "Save the resulting .docx file and open it in Microsoft Word, Google Docs, or any compatible app to keep editing.",
      },
    ],
    faqs: [
      { question: "Will the formatting stay the same?", answer: "We keep layout, fonts, and images as close to the original PDF as the format allows." },
      { question: "Can I edit the file afterwards?", answer: "Yes, the output is a standard .docx file you can open and edit in Word or similar apps." },
    ],
  },
  {
    slug: "pdf-to-excel",
    name: "PDF to Excel",
    shortDescription: "Turn tables in a PDF into an editable spreadsheet.",
    heroDescription: "Turn tables in a PDF into an editable spreadsheet.",
    accent: "accent",
    category: "convert",
    icon: "pdf-to-excel",
    accept: "application/pdf",
    guideIntro:
      "Copying numbers out of a PDF by hand is slow and error-prone. Gojli's PDF to Excel tool detects tables and text in your PDF and turns them into an editable .xlsx spreadsheet.",
    guideSteps: [
      { title: "Upload your PDF", description: "Choose the PDF file with the tables or data you want in a spreadsheet." },
      {
        title: "Let Gojli convert it",
        description: "Your file is securely processed and converted, keeping rows and columns as close to the original layout as the format allows.",
      },
      {
        title: "Download your spreadsheet",
        description: "Save the resulting .xlsx file and open it in Excel, Google Sheets, or any compatible app.",
      },
    ],
    faqs: [
      { question: "Will tables stay lined up in columns?", answer: "We keep rows and columns as close to the original PDF layout as the format allows." },
      { question: "What about PDFs that are scanned images, not real text?", answer: "Run OCR first (see our OCR tool) to make the text recognizable, then convert to Excel." },
    ],
  },
  {
    slug: "pdf-to-ppt",
    name: "PDF to PowerPoint",
    shortDescription: "Convert PDF pages into editable slides.",
    heroDescription: "Convert PDF pages into editable slides.",
    accent: "primary",
    category: "convert",
    icon: "pdf-to-ppt",
    accept: "application/pdf",
    guideIntro:
      "Need to present or edit something that only exists as a PDF? Gojli's PDF to PowerPoint tool turns each page into an editable .pptx slide.",
    guideSteps: [
      { title: "Upload your PDF", description: "Choose the PDF file you want turned into a slide deck." },
      {
        title: "Let Gojli convert it",
        description: "Each page becomes its own slide, keeping layout, images, and text as close to the original as the format allows.",
      },
      {
        title: "Download your slide deck",
        description: "Save the resulting .pptx file and open it in PowerPoint, Google Slides, or any compatible app to keep editing.",
      },
    ],
    faqs: [
      { question: "Does each PDF page become a slide?", answer: "Yes, each page in the PDF becomes one slide in the output deck." },
      { question: "Can I edit the text and images afterwards?", answer: "Yes, the output is a standard .pptx file you can open and edit in PowerPoint or similar apps." },
    ],
  },
  {
    slug: "word-to-pdf",
    name: "Word to PDF",
    shortDescription: "Turn a Word document into a shareable, universal PDF.",
    heroDescription: "Turn a Word document into a shareable, universal PDF.",
    accent: "secondary",
    category: "convert",
    icon: "word-to-pdf",
    accept: ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    guideIntro:
      "Sending a Word document to someone who might not have Word installed? Gojli's Word to PDF tool converts .doc and .docx files into a universal PDF that looks the same on every device.",
    guideSteps: [
      {
        title: "Upload your Word document",
        description: "Select the .doc or .docx file you want to turn into a PDF.",
      },
      {
        title: "Let Gojli convert it",
        description: "Your document is converted while preserving fonts, formatting, and layout, so nothing shifts or looks different.",
      },
      {
        title: "Download your PDF",
        description: "Grab the finished PDF, ready to email, print, or share with anyone, on any device.",
      },
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
    heroDescription: "Convert spreadsheets into clean, print-ready PDFs.",
    accent: "accent",
    category: "convert",
    icon: "excel-to-pdf",
    accept: ".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    guideIntro:
      "Spreadsheets don't always print or share cleanly. Gojli's Excel to PDF tool turns .xls and .xlsx files into a print-ready PDF with rows and columns laid out properly.",
    guideSteps: [
      {
        title: "Upload your Excel file",
        description: "Choose the .xls or .xlsx spreadsheet you want to convert.",
      },
      {
        title: "Let Gojli convert it",
        description: "Every sheet in your workbook is converted and scaled to fit standard page sizes, splitting across pages where needed.",
      },
      {
        title: "Download your PDF",
        description: "Download the finished PDF, ready to print, archive, or send to colleagues without requiring Excel.",
      },
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
    heroDescription: "Turn a slide deck into a PDF anyone can open.",
    accent: "primary",
    category: "convert",
    icon: "ppt-to-pdf",
    accept: ".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation",
    guideIntro:
      "Not everyone has PowerPoint installed, but everyone can open a PDF. Gojli's PPT to PDF tool converts .ppt and .pptx presentations into a PDF that looks right for any viewer.",
    guideSteps: [
      {
        title: "Upload your presentation",
        description: "Select the .ppt or .pptx file you want to convert.",
      },
      {
        title: "Let Gojli convert it",
        description: "Each slide becomes a single PDF page, keeping your layout, images, and text intact.",
      },
      {
        title: "Download your PDF",
        description: "Download the finished PDF, ready to share, print, or present from any device.",
      },
    ],
    faqs: [
      { question: "Do animations and transitions carry over?", answer: "PDF is a static format, so each slide becomes a single page without animations." },
      { question: "Will slide design stay the same?", answer: "Yes, layout, images, and text keep their original look." },
    ],
  },
  {
    slug: "html-to-pdf",
    name: "HTML to PDF",
    shortDescription: "Turn a web page or HTML file into a PDF.",
    heroDescription: "Turn a web page or HTML file into a PDF.",
    accent: "accent",
    category: "convert",
    icon: "file",
    accept: ".html,.htm,text/html",
    guideIntro:
      "Need a permanent, shareable copy of a web page or a local HTML file? Gojli's HTML to PDF tool renders it in a real browser and gives you back a proper PDF.",
    guideSteps: [
      { title: "Choose a URL or an HTML file", description: "Paste the address of a live web page, or upload a saved .html file." },
      {
        title: "Let Gojli render it",
        description: "The page is rendered in a real browser, keeping layout, images, and styling as close to the original as possible.",
      },
      {
        title: "Download your PDF",
        description: "Save the resulting PDF, ready to archive, print, or share.",
      },
    ],
    faqs: [
      { question: "Can it convert pages that need a login?", answer: "No, the page is fetched the same way a normal visitor would see it, so anything behind a login or paywall won't come through." },
      { question: "Does long content split across pages properly?", answer: "Yes, the page is paginated like a normal print-to-PDF, splitting at page boundaries." },
    ],
  },
  {
    slug: "jpg-to-pdf",
    name: "JPG to PDF",
    shortDescription: "Turn one or more images into a clean, shareable PDF.",
    heroDescription: "Turn one or more images into a clean, shareable PDF.",
    accent: "secondary",
    category: "convert",
    icon: "image-to-pdf",
    accept: "image/jpeg,image/png",
    guideIntro:
      "Turning photos or scanned pages into one shareable file is easier as a PDF. Gojli's JPG to PDF tool combines JPG and PNG images into a single, clean PDF document.",
    guideSteps: [
      {
        title: "Upload your images",
        description: "Add one or more JPG or PNG files from your device, or drag them into the drop zone.",
      },
      {
        title: "Arrange the page order",
        description: "Reorder your images using the arrows so they appear in the PDF in the sequence you want.",
      },
      {
        title: "Convert and download",
        description: "Click Convert to PDF and download the finished document, with each image placed on its own page.",
      },
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
    heroDescription: "Lock your PDF with a password to control access.",
    accent: "accent",
    category: "core",
    icon: "protect-pdf",
    accept: "application/pdf",
    guideIntro:
      "Sharing sensitive documents means keeping them out of the wrong hands. Gojli's PDF Password Protect tool locks your file with a password using real AES-256 encryption, entirely inside your browser.",
    guideSteps: [
      {
        title: "Upload the PDF to protect",
        description: "Choose the PDF file you want to lock with a password.",
      },
      {
        title: "Set a password",
        description: "Type the password you want required to open the file. Choose something strong, since it can't be recovered later.",
      },
      {
        title: "Download your protected PDF",
        description: "Gojli encrypts the file locally and gives you a password-protected PDF that only opens with the right password.",
      },
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
    heroDescription: "Remove a password from a PDF you own.",
    accent: "primary",
    category: "core",
    icon: "unlock-pdf",
    accept: "application/pdf",
    guideIntro:
      "Forgotten why a PDF keeps asking for a password you already know? Gojli's Unlock PDF tool removes password protection from files you own or have permission to access.",
    guideSteps: [
      {
        title: "Upload the locked PDF",
        description: "Choose the password-protected PDF you want to unlock.",
      },
      {
        title: "Enter the current password",
        description: "Type in the existing password. Gojli uses it locally to decrypt the file — nothing is sent to a server.",
      },
      {
        title: "Download the unlocked PDF",
        description: "Save the unlocked PDF, which now opens instantly without a password prompt.",
      },
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
    heroDescription: "Fix sideways or upside-down pages in a PDF.",
    accent: "secondary",
    category: "core",
    icon: "rotate-pdf",
    accept: "application/pdf",
    guideIntro:
      "Scanned pages often come out sideways or upside down. Gojli's Rotate PDF tool fixes page orientation in a few clicks, for one page or the whole document.",
    guideSteps: [
      {
        title: "Upload the PDF to fix",
        description: "Choose the PDF file with pages that need rotating.",
      },
      {
        title: "Select pages and rotate",
        description: "Pick individual pages or the whole document, then rotate 90, 180, or 270 degrees until everything reads the right way up.",
      },
      {
        title: "Download your corrected PDF",
        description: "Download the fixed file with the new orientation saved permanently into the PDF.",
      },
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
    heroDescription: "Stamp text or a logo across your PDF pages.",
    accent: "accent",
    category: "core",
    icon: "watermark-pdf",
    accept: "application/pdf",
    guideIntro:
      "Marking documents as a draft, confidential, or branded with your logo helps control how they're used. Gojli's Watermark PDF tool stamps text or an image across every page.",
    guideSteps: [
      {
        title: "Upload the PDF to watermark",
        description: "Choose the PDF file you want to stamp.",
      },
      {
        title: "Add your text or logo",
        description: "Type your watermark text or upload a logo image, then set its position, color, and opacity on the page.",
      },
      {
        title: "Download your watermarked PDF",
        description: "Download the finished PDF with your watermark applied consistently across every page.",
      },
    ],
    faqs: [
      { question: "Can I control the watermark's opacity?", answer: "Yes, you'll be able to adjust transparency so it doesn't obscure the content." },
      { question: "Does it apply to every page?", answer: "Yes, by default it's stamped on every page, though page-range control is planned." },
    ],
  },
  {
    slug: "ocr",
    name: "OCR",
    shortDescription: "Make scanned pages searchable and selectable text.",
    heroDescription: "Make scanned pages searchable and selectable text.",
    accent: "secondary",
    category: "core",
    icon: "ocr",
    accept: "application/pdf",
    guideIntro:
      "A scanned PDF is really just a picture of a page — you can't select, search, or copy its text. Gojli's OCR tool recognizes the text in scanned pages and adds an invisible, searchable text layer on top, entirely in your browser.",
    guideSteps: [
      {
        title: "Upload the scanned PDF",
        description: "Choose the PDF with scanned or image-based pages you want to make searchable.",
      },
      {
        title: "Let Gojli recognize the text",
        description:
          "Each page is analyzed locally in your browser to recognize its text and word positions — nothing is uploaded to a server.",
      },
      {
        title: "Download your searchable PDF",
        description: "Download the same PDF with an invisible text layer added, so you can now select, search, and copy its content.",
      },
    ],
    faqs: [
      { question: "Does this change how the PDF looks?", answer: "No, the visible page is untouched — a searchable text layer is added underneath, invisibly." },
      { question: "How accurate is the recognized text?", answer: "It depends on scan quality — clean, high-resolution scans recognize much more accurately than blurry or skewed ones." },
      { question: "Which languages are supported?", answer: "English and Bengali are supported to start, with more planned." },
    ],
  },
  {
    slug: "delete-pages",
    name: "Delete Pages",
    shortDescription: "Remove unwanted pages from a PDF.",
    heroDescription: "Remove unwanted pages from a PDF.",
    accent: "accent",
    category: "core",
    icon: "split",
    accept: "application/pdf",
    guideIntro:
      "Blank pages, duplicates, or sections you no longer need are easy to remove without touching the rest of the document. Gojli's Delete Pages tool lets you pick exactly which pages to drop.",
    guideSteps: [
      { title: "Upload your PDF", description: "Choose the PDF file with pages you want to remove." },
      {
        title: "List the pages to delete",
        description: "Type in page numbers or ranges — like 1, 3-5 — for everything you want removed.",
      },
      {
        title: "Download the result",
        description: "Gojli rebuilds the PDF without those pages and gives you a direct download link.",
      },
    ],
    faqs: [
      { question: "Can I delete every page?", answer: "No, at least one page must remain in the resulting PDF." },
      { question: "Does this affect page quality?", answer: "No, the remaining pages are copied over exactly as they were." },
    ],
  },
  {
    slug: "edit-metadata",
    name: "Edit Metadata",
    shortDescription: "Change a PDF's title, author, and other properties.",
    heroDescription: "Change a PDF's title, author, and other properties.",
    accent: "primary",
    category: "core",
    icon: "file",
    accept: "application/pdf",
    guideIntro:
      "A PDF's title, author, and subject show up in file browsers, search results, and document properties dialogs. Gojli's Edit Metadata tool lets you update them directly.",
    guideSteps: [
      { title: "Upload your PDF", description: "Choose the PDF file whose properties you want to change." },
      {
        title: "Update the details",
        description: "Edit the title, author, subject, and keywords fields as needed.",
      },
      {
        title: "Download the updated PDF",
        description: "Download the same PDF with its metadata updated — the content itself is untouched.",
      },
    ],
    faqs: [
      { question: "Does this change the PDF's content?", answer: "No, only the document properties are updated — pages stay exactly the same." },
      { question: "Can I clear a field entirely?", answer: "Yes, leave it blank and it will be saved as empty." },
    ],
  },
  {
    slug: "create-bookmarks",
    name: "Create Bookmarks",
    shortDescription: "Add a navigable outline to a PDF.",
    heroDescription: "Add a navigable outline (table of contents) to a PDF.",
    accent: "primary",
    category: "core",
    icon: "file",
    accept: "application/pdf",
    guideIntro:
      "PDF readers show a bookmark sidebar for quick navigation, but not every PDF has one. Gojli's Create Bookmarks tool lets you add your own — jump to a page, give it a title, and it becomes a clickable entry in the outline panel.",
    guideSteps: [
      { title: "Upload your PDF", description: "Choose the PDF you want to add bookmarks to." },
      {
        title: "Add a bookmark for each page",
        description: "Browse to a page, type a title, and click Add Bookmark. Reorder or remove entries as needed.",
      },
      {
        title: "Save your bookmarked PDF",
        description: "Gojli writes the outline into the PDF and gives you a direct download link.",
      },
    ],
    faqs: [
      { question: "Where do the bookmarks show up?", answer: "In the outline/bookmarks sidebar panel of PDF readers like Adobe Acrobat, Preview, or browser PDF viewers." },
      { question: "Can I nest bookmarks under each other?", answer: "Not yet — this creates a flat list of top-level bookmarks." },
      { question: "Does this replace an existing outline?", answer: "Yes, saving overwrites any outline the PDF already had with the one you built here." },
    ],
  },
  {
    slug: "crop",
    name: "Crop",
    shortDescription: "Trim the margins or visible area of PDF pages.",
    heroDescription: "Trim the margins or visible area of PDF pages.",
    accent: "primary",
    category: "core",
    icon: "crop",
    accept: "application/pdf",
    guideIntro:
      "Scanned pages with wide margins, or a PDF exported with extra white space? Gojli's Crop tool lets you drag out exactly the area you want to keep, right on a live preview.",
    guideSteps: [
      { title: "Upload your PDF", description: "Choose the PDF file whose margins or visible area you want to trim." },
      {
        title: "Drag out the crop area",
        description: "Drag the box's edges or corners to set the area to keep, and move the whole box by dragging inside it.",
      },
      {
        title: "Crop and download",
        description: "Apply the crop to just the current page, or every page at once, then download the result.",
      },
    ],
    faqs: [
      { question: "Does cropping delete the trimmed content permanently?", answer: "No, it sets the page's visible area (CropBox) — most viewers and print show only the cropped region, but the original content is still in the file." },
      { question: "Can I use a different crop on different pages?", answer: "Yes, uncheck \"Apply to all pages\", set a crop, then move to another page and crop it separately." },
    ],
  },
  {
    slug: "extract-images",
    name: "Extract Images",
    shortDescription: "Save every embedded image out of a PDF.",
    heroDescription: "Save every embedded image out of a PDF.",
    accent: "accent",
    category: "core",
    icon: "image-to-pdf",
    accept: "application/pdf",
    guideIntro:
      "Need the original photos or graphics out of a PDF instead of the whole document? Gojli's Extract Images tool scans every page and pulls out each embedded image as its own downloadable file.",
    guideSteps: [
      { title: "Upload your PDF", description: "Choose the PDF whose images you want to save out." },
      {
        title: "Let Gojli scan it",
        description: "Every page is scanned for embedded images, which are decoded right in your browser.",
      },
      {
        title: "Download each image",
        description: "Download each extracted image individually as a .jpg or .png file.",
      },
    ],
    faqs: [
      { question: "Does this work for every image in every PDF?", answer: "Most photos (JPEG-compressed) and simple raw images extract cleanly. A few less common encodings (JPEG2000, fax-compressed scans, indexed-palette images) aren't supported and are skipped." },
      { question: "Are duplicate images extracted more than once?", answer: "No, an image reused across multiple pages is only extracted once." },
    ],
  },
  {
    slug: "flip",
    name: "Flip",
    shortDescription: "Mirror PDF pages horizontally or vertically.",
    heroDescription: "Mirror PDF pages horizontally or vertically.",
    accent: "secondary",
    category: "core",
    icon: "flip-h",
    accept: "application/pdf",
    guideIntro:
      "Need a mirrored version of a page — for a transfer print, a scanned page saved backwards, or a design mockup? Gojli's Flip tool mirrors each page's content horizontally or vertically, page by page.",
    guideSteps: [
      { title: "Upload your PDF", description: "Choose the PDF file you want to mirror." },
      {
        title: "Flip each page as needed",
        description: "Toggle horizontal or vertical flip on any page individually, or flip every page at once.",
      },
      {
        title: "Save your flipped PDF",
        description: "Gojli mirrors the content of every flipped page and gives you a direct download link.",
      },
    ],
    faqs: [
      { question: "Is this the same as rotating a page?", answer: "No — rotating turns a page, but a mirror flip reverses it like a reflection, which a rotation alone can never do." },
      { question: "Can I flip both horizontally and vertically at once?", answer: "Yes, that combination is equivalent to a 180° rotation with mirrored content." },
    ],
  },
  {
    slug: "grayscale",
    name: "Grayscale",
    shortDescription: "Convert a color PDF to black and white.",
    heroDescription: "Convert a color PDF to black and white.",
    accent: "secondary",
    category: "core",
    icon: "grayscale",
    accept: "application/pdf",
    guideIntro:
      "Printing on a black-and-white printer, or just want a document without color? Gojli's Grayscale tool desaturates every page — text, graphics, and images alike.",
    guideSteps: [
      { title: "Upload your PDF", description: "Choose the color PDF you want converted to black and white." },
      {
        title: "Pick a quality level",
        description: "Higher quality looks sharper (especially for text-heavy pages) at the cost of a larger file.",
      },
      {
        title: "Download your grayscale PDF",
        description: "Gojli desaturates every page and gives you a direct download link.",
      },
    ],
    faqs: [
      { question: "Will the text still be selectable afterward?", answer: "No — each page is converted to a high-resolution grayscale image, so text is no longer selectable or searchable, only visible." },
      { question: "Why rasterize instead of just recoloring the text and shapes?", answer: "Rasterizing guarantees every element on the page — text, vector graphics, images, gradients — is genuinely desaturated, rather than only some of them." },
    ],
  },
  {
    slug: "flatten-pdf",
    name: "Flatten PDF",
    shortDescription: "Merge form fields and layers into static page content.",
    heroDescription: "Merge form fields and layers into static page content.",
    accent: "secondary",
    category: "core",
    icon: "form-field",
    accept: "application/pdf",
    guideIntro:
      "A filled-out form is still editable until it's flattened — the field values become permanent, static page content that can't be accidentally changed. Gojli's Flatten tool does this in one click.",
    guideSteps: [
      { title: "Upload your PDF", description: "Choose the PDF with form fields you want to lock in place." },
      {
        title: "Flatten the form",
        description: "Gojli merges every field's current value into the page content and removes the interactive form.",
      },
      {
        title: "Download the flattened PDF",
        description: "Download the result — field values are now permanent and can no longer be edited as a form.",
      },
    ],
    faqs: [
      { question: "Can I undo a flatten?", answer: "Not on the same file — keep a copy of the original if you might need to edit the form again." },
      { question: "Does this work on PDFs without forms?", answer: "It's safe to run, but there's nothing to flatten if the PDF has no form fields." },
    ],
  },
  {
    slug: "remove-annotations",
    name: "Remove Annotations",
    shortDescription: "Strip comments, highlights, and markup from a PDF.",
    heroDescription: "Strip comments, highlights, and markup from a PDF.",
    accent: "accent",
    category: "core",
    icon: "highlighter",
    accept: "application/pdf",
    guideIntro:
      "Comments, highlights, sticky notes, and other markup can pile up after a document's been through several rounds of review. Gojli's Remove Annotations tool strips all of it, leaving just the underlying page content.",
    guideSteps: [
      { title: "Upload your PDF", description: "Choose the PDF with comments or markup you want removed." },
      {
        title: "Remove all annotations",
        description: "Gojli clears every comment, highlight, stamp, and markup layer from each page.",
      },
      {
        title: "Download the clean PDF",
        description: "Download the PDF with only the original page content remaining.",
      },
    ],
    faqs: [
      { question: "Does this remove form fields too?", answer: "No, this only targets comments and markup annotations, not fillable form fields." },
      { question: "Can I choose which annotations to keep?", answer: "Not yet — this removes all of them at once." },
    ],
  },
  {
    slug: "resize-pdf",
    name: "Resize PDF",
    shortDescription: "Change the page size of a PDF.",
    heroDescription: "Change the page size of a PDF.",
    accent: "primary",
    category: "core",
    icon: "shape-rect",
    accept: "application/pdf",
    guideIntro:
      "Need a document in A4 instead of Letter, or scaled up for printing? Gojli's Resize PDF tool changes every page's dimensions while scaling the content to match.",
    guideSteps: [
      { title: "Upload your PDF", description: "Choose the PDF file you want to resize." },
      {
        title: "Pick a page size",
        description: "Choose a standard size like A4 or Letter, or set custom dimensions.",
      },
      {
        title: "Download the resized PDF",
        description: "Gojli scales every page's content to fit the new size and gives you a direct download link.",
      },
    ],
    faqs: [
      { question: "Will content get cut off?", answer: "No, page content is scaled proportionally to fit the new page size." },
      { question: "Does this affect all pages?", answer: "Yes, the new size is applied to every page in the document." },
    ],
  },
  {
    slug: "pdf-to-text",
    name: "PDF to Text",
    shortDescription: "Extract plain text content from a PDF.",
    heroDescription: "Extract plain text content from a PDF.",
    accent: "secondary",
    category: "convert",
    icon: "file",
    accept: "application/pdf",
    guideIntro:
      "Sometimes you just need the words, not the formatting. Gojli's PDF to Text tool pulls the plain text content out of a PDF and gives you a downloadable .txt file.",
    guideSteps: [
      { title: "Upload your PDF", description: "Choose the PDF file you want to extract text from." },
      {
        title: "Let Gojli read it",
        description: "Text is extracted from every page directly in your browser.",
      },
      {
        title: "Download the text file",
        description: "Download a plain .txt file containing the extracted content, page by page.",
      },
    ],
    faqs: [
      { question: "Does this work on scanned PDFs?", answer: "Only if the PDF already has a text layer — for scanned images, run OCR first." },
      { question: "Is formatting preserved?", answer: "No, this extracts plain text only, without fonts, layout, or images." },
    ],
  },
  {
    slug: "pdf-to-jpg",
    name: "PDF to JPG",
    shortDescription: "Save each PDF page as a JPG image.",
    heroDescription: "Save each PDF page as a JPG image.",
    accent: "accent",
    category: "convert",
    icon: "image-to-pdf",
    accept: "application/pdf",
    guideIntro:
      "Need a page as an image for a slide deck or a quick preview? Gojli's PDF to JPG tool renders every page as its own downloadable JPG image, directly in your browser.",
    guideSteps: [
      { title: "Upload your PDF", description: "Choose the PDF file you want to convert to images." },
      {
        title: "Let Gojli render each page",
        description: "Every page is rendered to a high-quality JPG image locally in your browser.",
      },
      {
        title: "Download your images",
        description: "Download each page individually, or grab all of them at once as a .zip file.",
      },
    ],
    faqs: [
      { question: "Can I control image quality?", answer: "Pages are rendered at a high, print-friendly resolution by default." },
      { question: "Can I convert just one page?", answer: "Yes, you can download individual pages instead of the full set." },
    ],
  },
  {
    slug: "page-numbers",
    name: "Page Numbers",
    shortDescription: "Stamp page numbers onto every page.",
    heroDescription: "Stamp page numbers onto every page, in any format and position you choose.",
    accent: "primary",
    category: "core",
    icon: "text-multiline",
    accept: "application/pdf",
    guideIntro:
      "Gojli's Page Numbers tool stamps a consistent number onto every page, with control over the format, starting number, and exactly where it appears on the page.",
    guideSteps: [
      { title: "Upload your PDF", description: "Choose the PDF file you want to number." },
      {
        title: "Set the format and position",
        description: "Choose a starting number and digit padding, then click or drag on the preview to place the number.",
      },
      {
        title: "Download your numbered PDF",
        description: "Gojli stamps every page and gives you a direct download link.",
      },
    ],
    faqs: [
      { question: "Can I start from a number other than 1?", answer: "Yes, you can set any starting number." },
      { question: "Can I control exactly where the number appears?", answer: "Yes, click or drag anywhere on the page preview to place it, or use one of the quick corner presets." },
      { question: "I need Bates-style legal numbering (e.g. ABC-000001) — is that here?", answer: "That's a dedicated tool now — see Bates Numbering." },
    ],
  },
  {
    slug: "bates-numbering",
    name: "Bates Numbering",
    shortDescription: "Stamp sequential legal numbering (e.g. ABC-000001) onto every page.",
    heroDescription: "Stamp sequential Bates-style legal numbering, like ABC-000001, onto every page.",
    accent: "primary",
    category: "core",
    icon: "text-multiline",
    accept: "application/pdf",
    guideIntro:
      "Gojli's Bates Numbering tool stamps a sequential, zero-padded identifier — the standard used for legal document production — onto every page, with a custom prefix and control over exactly where it appears.",
    guideSteps: [
      { title: "Upload your PDF", description: "Choose the PDF file you want to Bates-stamp." },
      {
        title: "Set the prefix and starting number",
        description: "Choose a prefix (e.g. ABC-), a starting number, and how many digits to zero-pad to, then click or drag on the preview to place the stamp.",
      },
      {
        title: "Download your stamped PDF",
        description: "Gojli stamps every page and gives you a direct download link.",
      },
    ],
    faqs: [
      { question: "What is Bates numbering?", answer: "A sequential identifier (e.g. ABC-000001) stamped onto every page of a legal document production, used to track and reference pages consistently across a case." },
      { question: "Can I continue numbering from a previous batch?", answer: "Yes, set the starting number to continue right after the last number you used." },
      { question: "Can I change the digit padding?", answer: "Yes — e.g. 6 digits gives ABC-000001, while 4 gives ABC-0001." },
    ],
  },
  {
    slug: "header-footer",
    name: "Header & Footer",
    shortDescription: "Add running text, page numbers, or dates to every page.",
    heroDescription: "Add running text, page numbers, or dates to every page.",
    accent: "secondary",
    category: "core",
    icon: "text-multiline",
    accept: "application/pdf",
    guideIntro:
      "Add a consistent header or footer — a document title, date, or confidentiality notice — across every page. Gojli's Header & Footer tool stamps left, center, and right text zones onto your PDF.",
    guideSteps: [
      { title: "Upload your PDF", description: "Choose the PDF file you want to add a header or footer to." },
      {
        title: "Type your header/footer text",
        description: "Fill in any combination of left, center, and right text for the header and footer — use {page} and {pages} for page numbers.",
      },
      {
        title: "Download the result",
        description: "Gojli stamps the text onto every page and gives you a direct download link.",
      },
    ],
    faqs: [
      { question: "Can I include page numbers in the footer text?", answer: "Yes, use {page} for the current page and {pages} for the total page count." },
      { question: "Can I leave the header empty and only add a footer?", answer: "Yes, any of the six text zones can be left blank." },
    ],
  },
  {
    slug: "n-up",
    name: "N-up",
    shortDescription: "Print multiple pages onto a single sheet.",
    heroDescription: "Print multiple pages onto a single sheet, in a grid layout.",
    accent: "primary",
    category: "core",
    icon: "grid",
    accept: "application/pdf",
    guideIntro:
      "Save paper by fitting several pages onto one sheet — Gojli's N-up tool arranges your PDF's pages into a grid (2, 4, 6, or 9 per sheet) on new A4 pages.",
    guideSteps: [
      { title: "Upload your PDF", description: "Choose the PDF file you want laid out multiple-pages-per-sheet." },
      {
        title: "Pick a layout",
        description: "Choose how many pages per sheet (2, 4, 6, or 9) and the sheet orientation.",
      },
      {
        title: "Download your laid-out PDF",
        description: "Gojli scales each page to fit its grid cell (keeping its original proportions) and gives you a direct download link.",
      },
    ],
    faqs: [
      { question: "Will pages get stretched or distorted?", answer: "No, each page is scaled down proportionally to fit its cell, then centered — nothing is stretched." },
      { question: "What size are the output sheets?", answer: "Standard A4, in the orientation you choose." },
    ],
  },
  {
    slug: "repair",
    name: "Repair",
    shortDescription: "Attempt to fix a corrupted or unreadable PDF.",
    heroDescription: "Attempt to fix a corrupted or unreadable PDF.",
    accent: "secondary",
    category: "core",
    icon: "file",
    accept: "application/pdf",
    guideIntro:
      "A PDF that won't open properly often just has a damaged internal structure, not damaged content. Gojli's Repair tool re-parses the file as leniently as possible and rebuilds it as a fresh, well-formed PDF.",
    guideSteps: [
      { title: "Upload your damaged PDF", description: "Choose the PDF file that won't open properly or shows errors." },
      {
        title: "Let Gojli attempt a repair",
        description: "The file is re-parsed carefully and rebuilt with a clean internal structure.",
      },
      {
        title: "Download the repaired PDF",
        description: "If any pages were recoverable, download the rebuilt file.",
      },
    ],
    faqs: [
      { question: "Can this fix any corrupted PDF?", answer: "No — it fixes common structural issues (a broken cross-reference table, minor invalid objects), but a severely truncated or overwritten file may not be recoverable at all." },
      { question: "Will this change the content of my PDF?", answer: "No, only the file's internal structure is rebuilt — the visible content is left as-is." },
    ],
  },
  {
    slug: "deskew",
    name: "Deskew",
    shortDescription: "Straighten crooked scanned pages.",
    heroDescription: "Straighten crooked scanned pages.",
    accent: "secondary",
    category: "core",
    icon: "rotate-pdf",
    accept: "application/pdf",
    guideIntro:
      "A page scanned slightly crooked is easy to fix by eye — Gojli's Deskew tool lets you dial in the exact correction angle on a live preview, page by page.",
    guideSteps: [
      { title: "Upload your scanned PDF", description: "Choose the PDF with the crooked scanned page(s)." },
      {
        title: "Dial in the angle",
        description: "Use the slider to rotate the preview until the page looks straight, on each page that needs it.",
      },
      {
        title: "Download the straightened PDF",
        description: "Gojli rotates each adjusted page by its exact angle and gives you a direct download link.",
      },
    ],
    faqs: [
      { question: "Does this detect the skew automatically?", answer: "No, there's no automatic crooked-scan detection — you dial in the angle by eye against a live preview." },
      { question: "Does the page size change?", answer: "No, the page dimensions stay the same — only the content rotates within them." },
    ],
  },
];

export function getToolBySlug(slug: string): Tool | undefined {
  return tools.find((tool) => tool.slug === slug);
}
