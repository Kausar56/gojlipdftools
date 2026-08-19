import Link from "next/link";
import { tools, type Tool } from "@/lib/tools";

// Curated per-column groupings for the footer sitemap — finer-grained than
// lib/tools.ts's own ToolCategory ("core"/"convert" only), which would
// otherwise dump all 32 "core" tools into one unreadably long column. Order
// here is also the display order within each column.
const FOOTER_GROUPS: { title: string; slugs: string[] }[] = [
  {
    title: "Organize PDF",
    slugs: [
      "merge-pdf",
      "split-pdf",
      "split-by-bookmarks",
      "split-by-size",
      "split-by-text",
      "organize",
      "alternate-mix",
      "delete-pages",
      "extract-images",
      "create-bookmarks",
      "n-up",
    ],
  },
  {
    title: "Edit & Annotate",
    slugs: [
      "edit-pdf",
      "fill-sign",
      "create-forms",
      "watermark-pdf",
      "rotate-pdf",
      "crop",
      "flip",
      "grayscale",
      "page-numbers",
      "bates-numbering",
      "header-footer",
      "edit-metadata",
    ],
  },
  {
    title: "Optimize & Security",
    slugs: ["compress-pdf", "protect-pdf", "unlock-pdf", "ocr", "flatten-pdf", "remove-annotations", "resize-pdf", "repair", "deskew"],
  },
  {
    title: "Convert PDF",
    slugs: [
      "pdf-to-word",
      "pdf-to-excel",
      "pdf-to-ppt",
      "word-to-pdf",
      "excel-to-pdf",
      "ppt-to-pdf",
      "html-to-pdf",
      "jpg-to-pdf",
      "pdf-to-text",
      "pdf-to-jpg",
    ],
  },
];

const companyLinks = [
  { href: "/about", label: "About" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
];

function toolBySlug(slug: string): Tool | undefined {
  return tools.find((tool) => tool.slug === slug);
}

export function Footer() {
  return (
    <footer className="bg-base-200">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
        <div className="max-w-sm">
          <p className="text-lg font-semibold text-base-content">Gojli</p>
          <p className="mt-2 text-sm text-base-content/70">Efficient document workflows for the modern professional.</p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {FOOTER_GROUPS.map((group) => {
            const groupTools = group.slugs.map(toolBySlug).filter((tool): tool is Tool => Boolean(tool));
            return (
              <div key={group.title}>
                <p className="text-sm font-semibold text-base-content">{group.title}</p>
                <ul className="mt-3 space-y-2 text-sm text-base-content/70">
                  {groupTools.map((tool) => (
                    <li key={tool.slug}>
                      <Link href={`/${tool.slug}`} className="hover:text-primary">
                        {tool.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          <div>
            <p className="text-sm font-semibold text-base-content">Company</p>
            <ul className="mt-3 space-y-2 text-sm text-base-content/70">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-primary">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-base-300/60 py-4 text-center text-xs text-base-content/60">
        © {new Date().getFullYear()} Gojli. Efficient document workflows.
      </div>
    </footer>
  );
}
