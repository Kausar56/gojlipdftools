import sanitizeHtml from "sanitize-html";

// Shared between the blog post editor and the admin tool-content editor —
// both accept HTML from the same rich text editor (components/RichTextEditor.tsx),
// and both need the same trust boundary: this is the one place raw HTML from
// that editor ever gets written to the database, regardless of which admin
// screen it came from.
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1", "h2", "h3", "h4", "p", "br", "hr",
    "b", "strong", "i", "em", "s", "strike", "u", "code", "pre",
    "blockquote", "ul", "ol", "li", "a", "img",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "title"],
  },
  allowedSchemes: ["http", "https", "data"],
};

export function sanitizeRichTextHtml(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}
