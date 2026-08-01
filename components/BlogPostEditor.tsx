"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { ToolIcon } from "./icons";
import { slugify } from "@/lib/blogSlug";
import type { BlogPost } from "@/lib/blog";
import type { ActionState } from "@/app/admin/blog/actions";

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
  const contentImageInputRef = useRef<HTMLInputElement>(null);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, {});

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(post));
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [metaTitle, setMetaTitle] = useState(post?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(post?.metaDescription ?? "");
  const [tags, setTags] = useState((post?.tags ?? []).join(", "));
  const [status, setStatus] = useState<"draft" | "published">(post?.status ?? "draft");
  const [thumbnailUrl, setThumbnailUrl] = useState(post?.thumbnailUrl ?? "");
  const [thumbnailPublicId, setThumbnailPublicId] = useState(post?.thumbnailPublicId ?? "");
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [contentHtml, setContentHtml] = useState(post?.contentHtml ?? "");

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(title));
  }, [title, slugTouched]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
      Image,
      Placeholder.configure({ placeholder: "Write your post..." }),
    ],
    content: post?.contentHtml ?? "",
    onUpdate: ({ editor }) => setContentHtml(editor.getHTML()),
  });

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

  async function handleContentImageFile(file: File) {
    setUploadError("");
    try {
      const { url } = await uploadImage(file);
      editor?.chain().focus().setImage({ src: url }).run();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Couldn't upload the image.");
    }
  }

  function setLink() {
    const url = window.prompt("Link URL");
    if (url === null) return;
    if (!url) {
      editor?.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

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
        <div className="mt-1.5 rounded-lg border border-base-300">
          <div className="flex flex-wrap items-center gap-1 border-b border-base-300 p-1.5">
            <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()} className={`btn btn-ghost btn-xs ${editor?.isActive("bold") ? "btn-active" : ""}`}>
              <ToolIcon name="bold" className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} className={`btn btn-ghost btn-xs ${editor?.isActive("italic") ? "btn-active" : ""}`}>
              <ToolIcon name="italic" className="h-3.5 w-3.5" />
            </button>
            <span className="mx-0.5 h-4 w-px bg-base-300" />
            <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} className={`btn btn-ghost btn-xs ${editor?.isActive("heading", { level: 1 }) ? "btn-active" : ""}`}>
              H1
            </button>
            <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className={`btn btn-ghost btn-xs ${editor?.isActive("heading", { level: 2 }) ? "btn-active" : ""}`}>
              H2
            </button>
            <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} className={`btn btn-ghost btn-xs ${editor?.isActive("heading", { level: 3 }) ? "btn-active" : ""}`}>
              H3
            </button>
            <span className="mx-0.5 h-4 w-px bg-base-300" />
            <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()} className={`btn btn-ghost btn-xs ${editor?.isActive("bulletList") ? "btn-active" : ""}`}>
              • List
            </button>
            <button type="button" onClick={() => editor?.chain().focus().toggleOrderedList().run()} className={`btn btn-ghost btn-xs ${editor?.isActive("orderedList") ? "btn-active" : ""}`}>
              1. List
            </button>
            <button type="button" onClick={() => editor?.chain().focus().toggleBlockquote().run()} className={`btn btn-ghost btn-xs ${editor?.isActive("blockquote") ? "btn-active" : ""}`}>
              Quote
            </button>
            <button type="button" onClick={() => editor?.chain().focus().toggleCodeBlock().run()} className={`btn btn-ghost btn-xs ${editor?.isActive("codeBlock") ? "btn-active" : ""}`}>
              Code
            </button>
            <span className="mx-0.5 h-4 w-px bg-base-300" />
            <button type="button" onClick={setLink} className={`btn btn-ghost btn-xs ${editor?.isActive("link") ? "btn-active" : ""}`}>
              <ToolIcon name="link" className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => contentImageInputRef.current?.click()} className="btn btn-ghost btn-xs">
              <ToolIcon name="image-to-pdf" className="h-3.5 w-3.5" />
            </button>
            <input
              ref={contentImageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) handleContentImageFile(file);
              }}
            />
            <span className="mx-0.5 h-4 w-px bg-base-300" />
            <button type="button" onClick={() => editor?.chain().focus().undo().run()} className="btn btn-ghost btn-xs">
              <ToolIcon name="undo" className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => editor?.chain().focus().redo().run()} className="btn btn-ghost btn-xs">
              <ToolIcon name="redo" className="h-3.5 w-3.5" />
            </button>
          </div>
          <EditorContent
            editor={editor}
            className="prose prose-sm max-w-none min-h-[300px] px-4 py-3 focus:outline-none [&_.ProseMirror]:min-h-[280px] [&_.ProseMirror]:outline-none"
          />
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-base-content">Status</p>
        <div className="mt-1.5 flex gap-2">
          {(["draft", "published"] as const).map((value) => (
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
      </div>

      {uploadError && <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{uploadError}</p>}
      {state.error && <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{state.error}</p>}

      <button type="submit" disabled={isPending} className="btn btn-primary w-full">
        {isPending ? "Saving..." : post ? "Save Changes" : "Create Post"}
      </button>
    </form>
  );
}
