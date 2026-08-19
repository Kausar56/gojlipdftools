"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";
import type { Quill } from "react-quill-new";

// Quill reads from `document` as soon as it's constructed, so it can't run
// during SSR — Next still does a first server-side pass even for a "use
// client" component, so this still needs the dynamic()+ssr:false wrapper.
const QuillEditor = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => <div className="min-h-40 animate-pulse rounded-lg border border-base-300 bg-base-200" />,
});

// Fixed regardless of whether image upload is wired up — formats only
// controls which inline styles/blots Quill is allowed to keep, not which
// toolbar buttons show, and it must stay referentially stable across
// renders (a new array here would make react-quill-new tear down and
// recreate the whole editor instance on every parent re-render).
const FORMATS = ["header", "bold", "italic", "underline", "strike", "blockquote", "code-block", "list", "link", "image"];

/** Shared rich-text editor for both the blog post editor and the admin tool-
 *  content editor — a thin, reusable wrapper around react-quill-new so the
 *  Quill setup (dynamic import, toolbar, image-upload handler) only lives in
 *  one place. */
// Both variants spelled out in full (rather than building the class string
// from a template literal) so Tailwind's static scanner — which only
// recognizes complete literal class names appearing in the source, never
// runtime-interpolated ones — actually generates the CSS for both.
// Capped with [&_.ql-editor]:max-h-* + overflow-y-auto so a long post scrolls
// inside the editing area instead of growing the box taller — without a cap,
// the toolbar (a sibling above .ql-editor, not sticky) ends up pages above
// wherever you're currently typing, forcing a scroll to the top of the page
// just to reach a formatting button.
const WRAPPER_CLASSES = {
  sm: "[&_.ql-editor]:min-h-32 [&_.ql-editor]:max-h-64 [&_.ql-editor]:overflow-y-auto [&_.ql-editor]:text-sm [&_.ql-toolbar]:rounded-t-lg [&_.ql-container]:rounded-b-lg",
  lg: "[&_.ql-editor]:min-h-70 [&_.ql-editor]:max-h-[420px] [&_.ql-editor]:overflow-y-auto [&_.ql-editor]:text-sm [&_.ql-toolbar]:rounded-t-lg [&_.ql-container]:rounded-b-lg",
};

export function RichTextEditor({
  defaultValue,
  onChange,
  placeholder,
  size = "sm",
  onImageUpload,
}: {
  defaultValue?: string;
  onChange: (html: string) => void;
  placeholder?: string;
  size?: keyof typeof WRAPPER_CLASSES;
  /** Omit to leave the image button off the toolbar entirely (e.g. short
   *  tool-guide snippets that don't need embedded images). Must be a stable
   *  reference (module-level function or useCallback) — see FORMATS above
   *  for why an unstable prop here would be costly. */
  onImageUpload?: (file: File) => Promise<string>;
}) {
  const modules = useMemo(() => {
    const toolbar: (string | Record<string, unknown>)[][] = [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      ["blockquote", "code-block"],
      [{ list: "ordered" }, { list: "bullet" }],
      onImageUpload ? ["link", "image"] : ["link"],
      ["clean"],
    ];

    if (!onImageUpload) return { toolbar: { container: toolbar } };

    return {
      toolbar: {
        container: toolbar,
        handlers: {
          // A regular function (not an arrow function) — Quill calls this
          // with `this` bound to the toolbar module, which is how
          // `this.quill` below gets the actual editor instance without
          // needing a ref.
          image(this: { quill: Quill }) {
            const quill = this.quill;
            const range = quill.getSelection(true);
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = async () => {
              const file = input.files?.[0];
              if (!file) return;
              try {
                const url = await onImageUpload(file);
                quill.insertEmbed(range.index, "image", url, "user");
                quill.setSelection(range.index + 1, 0, "user");
              } catch {
                // onImageUpload's own caller is responsible for surfacing
                // the error (e.g. via its own error state) — nothing more
                // useful to do with it here.
              }
            };
            input.click();
          },
        },
      },
    };
  }, [onImageUpload]);

  return (
    <div className={WRAPPER_CLASSES[size]}>
      <QuillEditor
        theme="snow"
        defaultValue={defaultValue ?? ""}
        onChange={onChange}
        modules={modules}
        formats={FORMATS}
        placeholder={placeholder}
      />
    </div>
  );
}
