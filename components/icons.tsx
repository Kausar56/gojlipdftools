type IconProps = {
  className?: string;
};

const paths: Record<string, React.ReactNode> = {
  cloud: <path d="M6.5 19a4.5 4.5 0 0 1-.4-8.98A6 6 0 0 1 18 12a4 4 0 0 1 0 8H6.5z" />,
  "flip-h": (
    <>
      <path d="M12 3v18" strokeDasharray="2 3" />
      <path d="M16 8l4 4-4 4" />
      <path d="M8 8l-4 4 4 4" />
    </>
  ),
  grayscale: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none" />
    </>
  ),

  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3.5 2.5-6 5.5-6s5.5 2.5 5.5 6" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M15.5 14.2c2.4.2 4 2.4 4 5.8" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M20 20V8" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="8" height="8" rx="1" />
      <rect x="13" y="3" width="8" height="8" rx="1" />
      <rect x="3" y="13" width="8" height="8" rx="1" />
      <rect x="13" y="13" width="8" height="8" rx="1" />
    </>
  ),
  crop: (
    <>
      <path d="M6 2v14a2 2 0 0 0 2 2h14" />
      <path d="M18 22V8a2 2 0 0 0-2-2H2" />
    </>
  ),
  grip: (
    <>
      <circle cx="9" cy="6" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="15" cy="6" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="15" cy="18" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  ocr: (
    <>
      <rect x="4" y="4" width="12" height="16" rx="1.5" />
      <path d="M7 9h6M7 13h4" />
      <circle cx="17" cy="17" r="3.2" />
      <path d="M19.5 19.5L22 22" />
    </>
  ),
  file: (
    <>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6" />
    </>
  ),
  merge: (
    <>
      <path d="M8 3v6a2 2 0 0 0 2 2h4" />
      <path d="M16 3v6a2 2 0 0 1-2 2H10" />
      <path d="M12 11v10" />
      <path d="M9 18l3 3 3-3" />
    </>
  ),
  split: (
    <>
      <path d="M12 3v6" />
      <path d="M12 9L7 14v7" />
      <path d="M12 9l5 5v7" />
      <path d="M4 21h6" />
      <path d="M14 21h6" />
    </>
  ),
  compress: (
    <>
      <path d="M9 3v4a2 2 0 0 1-2 2H3" />
      <path d="M15 3v4a2 2 0 0 0 2 2h4" />
      <path d="M9 21v-4a2 2 0 0 0-2-2H3" />
      <path d="M15 21v-4a2 2 0 0 1 2-2h4" />
    </>
  ),
  "image-to-pdf": (
    <>
      <rect x="3" y="4" width="12" height="12" rx="1.5" />
      <path d="M3 13l3.5-3.5 3 3L13 9" />
      <circle cx="7" cy="8" r="1" />
      <path d="M17 8h4M19 6v4" />
      <path d="M17 16h4M17 20h4" />
    </>
  ),
  "word-to-pdf": (
    <>
      <rect x="3" y="4" width="12" height="12" rx="1.5" />
      <path d="M6 9h6M6 12h6M6 15h4" />
      <path d="M17 8h4M19 6v4" />
      <path d="M17 16h4M17 20h4" />
    </>
  ),
  "pdf-to-word": (
    <>
      <rect x="9" y="8" width="12" height="12" rx="1.5" />
      <path d="M12 13h6M12 16h6M12 19h4" />
      <path d="M3 8h4M5 6v4" />
      <path d="M3 16h4M3 20h4" />
    </>
  ),
  "excel-to-pdf": (
    <>
      <rect x="3" y="4" width="12" height="12" rx="1.5" />
      <path d="M3 8h12M3 12h12M9 4v12" />
      <path d="M17 8h4M19 6v4" />
      <path d="M17 16h4M17 20h4" />
    </>
  ),
  "ppt-to-pdf": (
    <>
      <rect x="3" y="4" width="12" height="12" rx="1.5" />
      <path d="M7 15V7M7 7l4 3-4 3.2" />
      <path d="M17 8h4M19 6v4" />
      <path d="M17 16h4M17 20h4" />
    </>
  ),
  "pdf-to-excel": (
    <>
      <rect x="9" y="8" width="12" height="12" rx="1.5" />
      <path d="M9 12h12M9 16h12M15 8v12" />
      <path d="M3 8h4M5 6v4" />
      <path d="M3 16h4M3 20h4" />
    </>
  ),
  "pdf-to-ppt": (
    <>
      <rect x="9" y="8" width="12" height="12" rx="1.5" />
      <path d="M13 19v-8M13 11l4 3-4 3.2" />
      <path d="M3 8h4M5 6v4" />
      <path d="M3 16h4M3 20h4" />
    </>
  ),
  "protect-pdf": (
    <>
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      <circle cx="12" cy="15.5" r="1.4" />
    </>
  ),
  "unlock-pdf": (
    <>
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path d="M8 11V7a4 4 0 0 1 7.2-2.4" />
      <circle cx="12" cy="15.5" r="1.4" />
    </>
  ),
  "rotate-pdf": (
    <>
      <rect x="5" y="7" width="10" height="13" rx="1.5" />
      <path d="M18 10a6 6 0 1 1-2-4.5" />
      <path d="M18 3v4h-4" />
    </>
  ),
  "watermark-pdf": (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M8 8h8M8 12h8M8 16h5" />
      <path d="M7 20l10-16" strokeDasharray="1.5 2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4" />
      <path d="M7 9l5-5 5 5" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </>
  ),
  check: <path d="M20 6L9 17l-5-5" />,
  "arrow-right": (
    <>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  bolt: <path d="M13 3L4 14h6l-1 7 9-11h-6l1-7z" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  history: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8l1.8-1.8M18 6l1.8-1.8" />
    </>
  ),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  "chevron-down": <path d="M6 9l6 6 6-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18" />
      <path d="M12 3a14 14 0 0 0 0 18" />
    </>
  ),
  "edit-pdf": (
    <>
      <path d="M4 7h11M4 12h6" />
      <path d="M14 19l1-3.5 6-6 2.5 2.5-6 6z" />
    </>
  ),
  cursor: <path d="M5 3l6.5 16 2-6.5L20 10.5z" />,
  "text-tool": <path d="M5 5h14M12 5v14" />,
  pen: (
    <>
      <path d="M4 20l1-4L15 6l3 3L8 19z" />
      <path d="M13 8l3 3" />
    </>
  ),
  shapes: (
    <>
      <rect x="4" y="9" width="9" height="9" rx="1" />
      <circle cx="16" cy="8" r="4" />
    </>
  ),
  "shape-rect": <rect x="4" y="6" width="16" height="12" rx="1" />,
  "shape-circle": <circle cx="12" cy="12" r="8" />,
  "shape-line": <path d="M5 19L19 5" />,
  "shape-arrow": (
    <>
      <path d="M5 19L19 5" />
      <path d="M19 5v6M19 5h-6" />
    </>
  ),
  "image-tool": (
    <>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M3 16l4.5-4.5a1.5 1.5 0 0 1 2.1 0L13 15l3-3a1.5 1.5 0 0 1 2.1 0L21 15" />
    </>
  ),
  highlighter: <path d="M4 20h6l10-10-6-6L4 14v6z" />,
  signature: (
    <>
      <path d="M4 20h16" />
      <path d="M6 17c2-4 3.5-9 3-11 1 1 1.5 4-1 9 2-1 4-3 5-3s1 1 0 2c2-1 4 0 4 1" />
    </>
  ),
  eraser: (
    <>
      <path d="M15 4l5 5-9 9H6l-3-3z" />
      <path d="M11 8l5 5" />
    </>
  ),
  undo: (
    <>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-2" />
    </>
  ),
  redo: (
    <>
      <path d="M15 14l5-5-5-5" />
      <path d="M20 9H10a6 6 0 0 0 0 12h2" />
    </>
  ),
  "zoom-in": (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M21 21l-4.3-4.3" />
      <path d="M10 7v6M7 10h6" />
    </>
  ),
  "zoom-out": (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M21 21l-4.3-4.3" />
      <path d="M7 10h6" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </>
  ),
  link: (
    <>
      <path d="M9 15l6-6" />
      <path d="M11 6l1.5-1.5a4 4 0 0 1 5.7 5.7L16.5 12" />
      <path d="M13 18l-1.5 1.5a4 4 0 0 1-5.7-5.7L7.5 12" />
    </>
  ),
  whiteout: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="1.5" fill="currentColor" opacity="0.15" />
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
      <path d="M8 12h8" />
    </>
  ),
  "form-field": (
    <>
      <rect x="3" y="7" width="18" height="10" rx="1.5" />
      <path d="M7 12h4" />
      <path d="M14 12l1.3 1.3L18 10.5" />
    </>
  ),
  checkbox: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 12.5l2.5 2.5L16 9" />
    </>
  ),
  trash: (
    <>
      <path d="M5 7h14" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M7 7l1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  "rotate-left": (
    <>
      <path d="M6 10a6 6 0 1 1 2 4.5" />
      <path d="M6 3v4h4" />
    </>
  ),
  "rotate-right": (
    <>
      <path d="M18 10a6 6 0 1 0-2 4.5" />
      <path d="M18 3v4h-4" />
    </>
  ),
  "plus-page": (
    <>
      <rect x="5" y="3" width="14" height="18" rx="1.5" />
      <path d="M12 9v6M9 12h6" />
    </>
  ),
  dot: <circle cx="12" cy="12" r="5" fill="currentColor" />,
  "dropdown-list": (
    <>
      <rect x="3" y="6" width="18" height="12" rx="1.5" />
      <path d="M15 10l2 2-2 2" />
      <path d="M7 10h4M7 14h3" />
    </>
  ),
  "radio-button": (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </>
  ),
  "text-multiline": (
    <>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="M6 9h12M6 12h12M6 15h8" />
    </>
  ),
  bold: <path d="M7 4h6a3.5 3.5 0 0 1 0 7H7zM7 11h7a3.5 3.5 0 0 1 0 7H7z" strokeWidth={1.2} fill="currentColor" />,
  italic: (
    <>
      <path d="M11 4h6M7 20h6" />
      <path d="M14 4L10 20" />
    </>
  ),
  "font-family": (
    <>
      <path d="M4 16L8.5 5h1L14 16" />
      <path d="M5.3 12.5h6.9" />
      <path d="M15 16c1 .6 2.2.6 3-.2M15 10.5c.8-.7 2-.7 3 0 .7.5 1 1.3 1 2.2V16" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 8 0 1 0 0 16c1 0 1.5-.5 1.5-1.3 0-.4-.2-.7-.4-1-.3-.3-.4-.6-.4-1 0-.8.6-1.4 1.4-1.4H16a4.5 4.5 0 0 0 4.5-4.5C20.5 6 16.7 3 12 3z" />
      <circle cx="7.5" cy="10.5" r="1" fill="currentColor" />
      <circle cx="10.5" cy="7" r="1" fill="currentColor" />
      <circle cx="15" cy="7.5" r="1" fill="currentColor" />
    </>
  ),
  duplicate: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="1.5" />
      <path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" />
    </>
  ),
  move: (
    <>
      <path d="M12 3v18M3 12h18" />
      <path d="M12 3l-2.5 2.5M12 3l2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5M3 12l2.5-2.5M3 12l2.5 2.5M21 12l-2.5-2.5M21 12l-2.5 2.5" />
    </>
  ),
  "align-left": <path d="M4 6h16M4 12h10M4 18h14" />,
  "align-center": <path d="M4 6h16M7 12h10M5 18h14" />,
  "align-right": <path d="M4 6h16M10 12h10M6 18h14" />,
  ticket: (
    <>
      <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.8a1.6 1.6 0 0 0 0 3.2V16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a1.6 1.6 0 0 0 0-3.2z" />
      <path d="M12 6v1.5M12 10.5v3M12 16.5V18" strokeDasharray="1.6 1.8" />
    </>
  ),
};

export function ToolIcon({ name, className }: IconProps & { name: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name] ?? paths["merge"]}
    </svg>
  );
}
