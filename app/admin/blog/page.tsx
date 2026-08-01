import type { Metadata } from "next";
import Link from "next/link";
import { getAllPostsForAdmin } from "@/lib/blog";
import { DeletePostButton } from "@/components/DeletePostButton";
import { deletePost } from "./actions";

export const metadata: Metadata = { title: "Blog" };
export const dynamic = "force-dynamic";

export default async function AdminBlogListPage() {
  const posts = await getAllPostsForAdmin();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-base-content">Blog</h1>
        <Link href="/admin/blog/new" className="btn btn-primary btn-sm">
          New Post
        </Link>
      </div>

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
              posts.map((post) => (
                <tr key={post.id}>
                  <td className="max-w-xs truncate">{post.title}</td>
                  <td>
                    <span className={`badge badge-sm ${post.status === "published" ? "badge-primary" : "badge-neutral"}`}>
                      {post.status}
                    </span>
                  </td>
                  <td>{new Date(post.updatedAt).toLocaleDateString()}</td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/blog/${post.id}`} className="text-sm text-primary hover:underline">
                        Edit
                      </Link>
                      <DeletePostButton action={deletePost.bind(null, post.id)} className="text-sm text-error hover:underline" />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
