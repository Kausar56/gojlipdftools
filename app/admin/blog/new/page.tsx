import type { Metadata } from "next";
import { BlogPostEditor } from "@/components/BlogPostEditor";
import { createPost } from "../actions";

export const metadata: Metadata = { title: "New Post" };

export default function NewBlogPostPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-base-content">New Post</h1>
      <div className="mt-4 max-w-3xl">
        <BlogPostEditor action={createPost} />
      </div>
    </div>
  );
}
