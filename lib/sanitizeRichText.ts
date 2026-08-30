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

// Matches an actual U+00A0 non-breaking-space character, built from its
// char code rather than typed directly in this file — typed directly it's
// visually indistinguishable from a plain space, which risks a future
// find-and-replace or reformat silently collapsing the two into the same
// (wrong) character.
const NBSP_PATTERN = new RegExp(String.fromCharCode(160), "g");

export function sanitizeRichTextHtml(html: string): string {
  // Content pasted from Word, Google Docs, or an AI tool's answer routinely
  // encodes ordinary spaces as non-breaking spaces (U+00A0) instead of
  // regular ones. A browser will never wrap a line at a non-breaking space —
  // that's the entire point of the character — so a paragraph typed this way
  // renders as one giant "unbreakable word": with no overflow-wrap rule it
  // just overflows its column to the right instead of wrapping, and with one
  // (overflow-wrap: break-word/anywhere) the browser is forced to split it at
  // an arbitrary character instead, which is what caused the earlier
  // mid-word-split bug ("position" -> "positio"/"n."). Neither is fixable
  // from CSS; the actual text has to stop containing them, which is why this
  // runs here rather than being a rendering concern. Re-saving an existing
  // post (even with no changes) reruns it through this and fixes that post.
  const normalized = html.replace(NBSP_PATTERN, " ").replace(/&nbsp;/gi, " ");
  return sanitizeHtml(normalized, SANITIZE_OPTIONS);
}
