import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getPostByIdForAdmin } from "@/lib/blog";
import { getCurrentViewerAccess, hasPermission } from "@/lib/adminAuth";
import { BlogPostEditor } from "@/components/BlogPostEditor";
import { DeletePostButton } from "@/components/DeletePostButton";
import { updatePost, deletePost } from "../actions";

export const metadata: Metadata = { title: "Edit Post" };
export const dynamic = "force-dynamic";

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPostByIdForAdmin(id);
  if (!post) notFound();

  const { user, access } = await getCurrentViewerAccess();
  const isOwnPost = post.authorId === user?.id;
  const canEdit = access.kind === "admin" || (hasPermission(access, "blog:edit_own") && isOwnPost);
  if (!canEdit) redirect("/admin/blog");
  const canDelete = access.kind === "admin" || (hasPermission(access, "blog:delete_own") && isOwnPost);

  const updateWithId = updatePost.bind(null, id);
  const deleteWithId = deletePost.bind(null, id);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-base-content">Edit Post</h1>
        {canDelete && <DeletePostButton action={deleteWithId} />}
      </div>
      <div className="mt-4 max-w-3xl">
        <BlogPostEditor post={post} action={updateWithId} />
      </div>
    </div>
  );
}
