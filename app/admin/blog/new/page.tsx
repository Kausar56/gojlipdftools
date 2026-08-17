import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentViewerAccess, hasPermission } from "@/lib/adminAuth";
import { BlogPostEditor } from "@/components/BlogPostEditor";
import { createPost } from "../actions";

export const metadata: Metadata = { title: "New Post" };
export const dynamic = "force-dynamic";

export default async function NewBlogPostPage() {
  const { access } = await getCurrentViewerAccess();
  if (!hasPermission(access, "blog:create")) redirect("/admin/blog");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-base-content">New Post</h1>
      <div className="mt-4 max-w-3xl">
        <BlogPostEditor action={createPost} />
      </div>
    </div>
  );
}
