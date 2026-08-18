import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAllPostsForAdmin } from "@/lib/blog";
import { getCurrentViewerAccess, hasPermission, hasAnyBlogPermission, getFallbackAdminPath } from "@/lib/adminAuth";
import { AdminBlogTable } from "@/components/AdminBlogTable";
import { deletePost } from "./actions";

export const metadata: Metadata = { title: "Blog" };
export const dynamic = "force-dynamic";

export default async function AdminBlogListPage() {
  const { user, access } = await getCurrentViewerAccess();
  // A moderator granted some other permission (stats:view, tool_content:edit,
  // ...) but no blog permission at all shouldn't be able to see this section
  // just by knowing the URL — the sidebar link is hidden for them too, but
  // that alone doesn't stop direct navigation.
  if (!hasAnyBlogPermission(access)) redirect(getFallbackAdminPath(access));

  const posts = await getAllPostsForAdmin();
  const canCreate = hasPermission(access, "blog:create");

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-base-content">Blog</h1>
        <div className="flex items-center gap-2">
          {access.kind === "admin" && (
            <Link href="/admin/tags" className="btn btn-ghost btn-sm">
              Manage Tags
            </Link>
          )}
          {canCreate && (
            <Link href="/admin/blog/new" className="btn btn-primary btn-sm">
              New Post
            </Link>
          )}
        </div>
      </div>
      {access.kind === "moderator" && (
        <p className="mt-1 text-xs text-base-content/50">
          You can see every post, but can only edit or delete the ones you wrote.
        </p>
      )}

      <AdminBlogTable posts={posts} currentUserId={user?.id ?? null} access={access} deleteAction={deletePost} />
    </div>
  );
}
