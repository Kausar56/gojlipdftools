"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useActionState } from "react";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";
import type { Quill } from "react-quill-new";
import { slugify } from "@/lib/blogSlug";
import type { BlogPost } from "@/lib/blog";
import type { ActionState } from "@/app/admin/blog/actions";

// Quill reads from `document` as soon as it's constructed, so it can't run
// during SSR — Next still does a first server-side pass even for a "use
// client" component, so this still needs the dynamic()+ssr:false wrapper.
const QuillEditor = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => <div className="min-h-85 animate-pulse rounded-lg border border-base-300 bg-base-200" />,
});

// Capped to h1-h3 (rather than Quill's default up to h6) to match what
// sanitizeHtml's allowlist keeps in app/admin/blog/actions.ts — picking h4-h6
// here would silently get stripped down to a plain paragraph on save.
const QUILL_TOOLBAR = [
  [{ header: [1, 2, 3, false] }],
  ["bold", "italic", "underline", "strike"],
  ["blockquote", "code-block"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["link", "image"],
  ["clean"],
];
const QUILL_FORMATS = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "blockquote",
  "code-block",
  "list",
  "link",
  "image",
];

async function uploadImage(file: File): Promise<{ url: string; publicId: string }> {
  const sigRes = await fetch("/api/admin/blog/upload-signature", { method: "POST" });
  if (!sigRes.ok) {
    const body = await sigRes.json().catch(() => ({}));
    throw new Error(body.error ?? "Couldn't get an upload signature.");
  }
  const { signature, timestamp, apiKey, cloudName, folder } = await sigRes.json();

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  form.append("folder", folder);

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });
  if (!uploadRes.ok) throw new Error("Uploading to Cloudinary failed.");
  const data = await uploadRes.json();
  return { url: data.secure_url as string, publicId: data.public_id as string };
}

export function BlogPostEditor({
  post,
  action,
}: {
  post?: BlogPost;
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, {});

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(post));
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [metaTitle, setMetaTitle] = useState(post?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(post?.metaDescription ?? "");
  const [tags, setTags] = useState((post?.tags ?? []).join(", "));
  const [status, setStatus] = useState<"draft" | "scheduled" | "published">(post?.status ?? "draft");
  const [scheduledAt, setScheduledAt] = useState(() => {
    if (!post?.scheduledAt) return "";
    // <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in local time —
    // toISOString() is UTC, so trim its offset-free local equivalent instead.
    const date = new Date(post.scheduledAt);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  });
  const [thumbnailUrl, setThumbnailUrl] = useState(post?.thumbnailUrl ?? "");
  const [thumbnailPublicId, setThumbnailPublicId] = useState(post?.thumbnailPublicId ?? "");
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [contentHtml, setContentHtml] = useState(post?.contentHtml ?? "");

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(title));
  }, [title, slugTouched]);

  async function handleThumbnailFile(file: File) {
    setThumbnailUploading(true);
    setUploadError("");
    try {
      const { url, publicId } = await uploadImage(file);
      setThumbnailUrl(url);
      setThumbnailPublicId(publicId);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Couldn't upload the thumbnail.");
    } finally {
      setThumbnailUploading(false);
    }
  }

  // Stable across renders (empty deps) — react-quill-new tears down and
  // recreates the whole Quill instance whenever this object's identity
  // changes, which would reset the cursor/undo history on every keystroke
  // if it were rebuilt on each render instead.
  const modules = useMemo(
    () => ({
      toolbar: {
        container: QUILL_TOOLBAR,
        handlers: {
          // A regular function (not an arrow function) — Quill calls this
          // with `this` bound to the toolbar module, which is how `this.quill`
          // below gets the actual editor instance without needing a ref.
          image(this: { quill: Quill }) {
            const quill = this.quill;
            const range = quill.getSelection(true);
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = async () => {
              const file = input.files?.[0];
              if (!file) return;
              setUploadError("");
              try {
                const { url } = await uploadImage(file);
                quill.insertEmbed(range.index, "image", url, "user");
                quill.setSelection(range.index + 1, 0, "user");
              } catch (error) {
                setUploadError(error instanceof Error ? error.message : "Couldn't upload the image.");
              }
            };
            input.click();
          },
        },
      },
    }),
    [],
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="contentHtml" value={contentHtml} />
      <input type="hidden" name="thumbnailUrl" value={thumbnailUrl} />
      <input type="hidden" name="thumbnailPublicId" value={thumbnailPublicId} />

      <label className="block text-sm font-medium text-base-content">
        Title
        <input
          type="text"
          name="title"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Post title"
          className="input input-bordered mt-1.5 w-full"
        />
      </label>

      <label className="block text-sm font-medium text-base-content">
        Slug
        <input
          type="text"
          name="slug"
          value={slug}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(event.target.value);
          }}
          placeholder="post-slug"
          className="input input-bordered mt-1.5 w-full font-mono text-sm"
        />
        <span className="mt-1 block text-xs text-base-content/50">
          Final URL: /blog/{slug || "..."}
        </span>
      </label>

      <label className="block text-sm font-medium text-base-content">
        Excerpt
        <textarea
          name="excerpt"
          value={excerpt}
          onChange={(event) => setExcerpt(event.target.value)}
          placeholder="A short summary shown on the blog list and used as the default SEO description."
          rows={2}
          className="textarea textarea-bordered mt-1.5 w-full"
        />
      </label>

      <label className="block text-sm font-medium text-base-content">
        Tags
        <input
          type="text"
          name="tags"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder="pdf, productivity, guide"
          className="input input-bordered mt-1.5 w-full"
        />
        <span className="mt-1 block text-xs text-base-content/50">Comma-separated. Shown on the post and used as SEO keywords.</span>
      </label>

      {post?.authorName && (
        <p className="text-xs text-base-content/50">
          Author: <span className="text-base-content/80">{post.authorName}</span> (set automatically from the creator&apos;s account)
        </p>
      )}

      <div className="collapse collapse-arrow border border-base-300 bg-base-100">
        <input type="checkbox" defaultChecked={Boolean(metaTitle || metaDescription)} />
        <div className="collapse-title text-sm font-medium text-base-content">SEO overrides (optional)</div>
        <div className="collapse-content space-y-3">
          <label className="block text-sm font-medium text-base-content">
            Meta title
            <input
              type="text"
              name="metaTitle"
              value={metaTitle}
              onChange={(event) => setMetaTitle(event.target.value)}
              placeholder={title || "Falls back to the title above"}
              className="input input-bordered mt-1.5 w-full"
            />
          </label>
          <label className="block text-sm font-medium text-base-content">
            Meta description
            <textarea
              name="metaDescription"
              value={metaDescription}
              onChange={(event) => setMetaDescription(event.target.value)}
              placeholder={excerpt || "Falls back to the excerpt above"}
              rows={2}
              className="textarea textarea-bordered mt-1.5 w-full"
            />
          </label>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-base-content">Thumbnail</p>
        <div className="mt-1.5 flex items-center gap-3">
          {thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnailUrl} alt="Thumbnail preview" className="h-16 w-24 rounded object-cover" />
          ) : (
            <div className="flex h-16 w-24 items-center justify-center rounded bg-base-200 text-xs text-base-content/40">
              No image
            </div>
          )}
          <button
            type="button"
            onClick={() => thumbnailInputRef.current?.click()}
            disabled={thumbnailUploading}
            className="btn btn-outline btn-sm"
          >
            {thumbnailUploading ? "Uploading..." : thumbnailUrl ? "Replace" : "Upload"}
          </button>
          <input
            ref={thumbnailInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) handleThumbnailFile(file);
            }}
          />
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-base-content">Content</p>
        <div className="mt-1.5 [&_.ql-editor]:min-h-70 [&_.ql-editor]:text-sm [&_.ql-toolbar]:rounded-t-lg [&_.ql-container]:rounded-b-lg">
          <QuillEditor
            theme="snow"
            defaultValue={post?.contentHtml ?? ""}
            onChange={setContentHtml}
            modules={modules}
            formats={QUILL_FORMATS}
            placeholder="Write your post..."
          />
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-base-content">Status</p>
        <div className="mt-1.5 flex gap-2">
          {(["draft", "scheduled", "published"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className={`btn btn-sm capitalize ${status === value ? "btn-primary" : "btn-outline"}`}
            >
              {value}
            </button>
          ))}
        </div>
        <input type="hidden" name="status" value={status} />

        {status === "scheduled" && (
          <label className="mt-3 block text-sm font-medium text-base-content">
            Publish at
            <input
              type="datetime-local"
              name="scheduledAt"
              required
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
              className="input input-bordered mt-1.5 w-full sm:max-w-xs"
            />
            <span className="mt-1 block text-xs text-base-content/50">
              Goes live automatically once this time passes — in your browser&apos;s local time.
            </span>
          </label>
        )}
      </div>

      {uploadError && <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{uploadError}</p>}
      {state.error && <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{state.error}</p>}

      <button type="submit" disabled={isPending} className="btn btn-primary w-full">
        {isPending ? "Saving..." : post ? "Save Changes" : "Create Post"}
      </button>
    </form>
  );
}
