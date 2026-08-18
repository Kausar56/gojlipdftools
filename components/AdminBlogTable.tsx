"use client";

import { useState } from "react";
import Link from "next/link";
import { hasPermission, type ViewerAccess } from "@/lib/permissions";
import type { BlogPost } from "@/lib/blog";
import { DeletePostButton } from "./DeletePostButton";
import { PaginationControls } from "./PaginationControls";

const PAGE_SIZE = 20;

export function AdminBlogTable({
  posts,
  currentUserId,
  access,
  deleteAction,
}: {
  posts: BlogPost[];
  currentUserId: string | null;
  access: ViewerAccess;
  deleteAction: (id: string) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = search.trim()
    ? posts.filter((post) => post.title.toLowerCase().includes(search.trim().toLowerCase()))
    : posts;

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pagePosts = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(0);
        }}
        placeholder="Search by title..."
        className="input input-bordered input-sm mt-4 w-full sm:max-w-xs"
      />

      <div className="mt-4 overflow-x-auto rounded-lg border border-base-300 bg-base-100">
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Author</th>
              <th>Status</th>
              <th>Updated</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {pagePosts.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-base-content/50">
                  {posts.length === 0 ? "No posts yet." : "No posts match."}
                </td>
              </tr>
            ) : (
              pagePosts.map((post) => {
                const isOwnPost = post.authorId === currentUserId;
                const canEdit =
                  access.kind === "admin" ||
                  hasPermission(access, "blog:edit_any") ||
                  (hasPermission(access, "blog:edit_own") && isOwnPost);
                const canDelete =
                  access.kind === "admin" ||
                  hasPermission(access, "blog:delete_any") ||
                  (hasPermission(access, "blog:delete_own") && isOwnPost);
                return (
                  <tr key={post.id}>
                    <td className="max-w-xs truncate">{post.title}</td>
                    <td className="whitespace-nowrap text-sm text-base-content/70">
                      {post.authorName ?? "—"}
                      {isOwnPost && <span className="ml-1 text-xs text-base-content/40">(You)</span>}
                    </td>
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
                            action={deleteAction.bind(null, post.id)}
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

      <PaginationControls
        currentPage={currentPage}
        pageCount={pageCount}
        onPrevious={() => setPage((p) => Math.max(0, p - 1))}
        onNext={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
      />
    </div>
  );
}
