import type { Metadata } from "next";
import Link from "next/link";
import { getAllPostsForAdmin } from "@/lib/blog";
import { getCurrentViewerAccess, hasPermission } from "@/lib/adminAuth";
import { DeletePostButton } from "@/components/DeletePostButton";
import { deletePost } from "./actions";

export const metadata: Metadata = { title: "Blog" };
export const dynamic = "force-dynamic";

export default async function AdminBlogListPage() {
  const [posts, { user, access }] = await Promise.all([getAllPostsForAdmin(), getCurrentViewerAccess()]);
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

      <div className="mt-4 overflow-x-auto rounded-lg border border-base-300 bg-base-100">
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Updated</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-base-content/50">
                  No posts yet.
                </td>
              </tr>
            ) : (
              posts.map((post) => {
                const isOwnPost = post.authorId === user?.id;
                const canEdit = access.kind === "admin" || (hasPermission(access, "blog:edit_own") && isOwnPost);
                const canDelete = access.kind === "admin" || (hasPermission(access, "blog:delete_own") && isOwnPost);
                return (
                  <tr key={post.id}>
                    <td className="max-w-xs truncate">{post.title}</td>
                    <td>
                      <span
                        className={`badge badge-sm ${
                          post.status === "published"
                            ? "badge-primary"
                            : post.status === "scheduled"
                              ? "badge-secondary"
                              : "badge-neutral"
                        }`}
                        title={post.status === "scheduled" && post.scheduledAt ? new Date(post.scheduledAt).toLocaleString() : undefined}
                      >
                        {post.status === "scheduled" && post.scheduledAt
                          ? `Scheduled · ${new Date(post.scheduledAt).toLocaleDateString()}`
                          : post.status}
                      </span>
                    </td>
                    <td>{new Date(post.updatedAt).toLocaleDateString()}</td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-3">
                        {canEdit ? (
                          <Link href={`/admin/blog/${post.id}`} className="text-sm text-primary hover:underline">
                            Edit
                          </Link>
                        ) : (
                          <span className="text-sm text-base-content/30">Edit</span>
                        )}
                        {canDelete && (
                          <DeletePostButton
                            action={deletePost.bind(null, post.id)}
                            className="text-sm text-error hover:underline"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
