"use client";

import { useState } from "react";
import type { TagUsage } from "@/lib/blogTags";

export function TagManager({
  tags,
  renameAction,
  deleteAction,
}: {
  tags: TagUsage[];
  renameAction: (oldTag: string, formData: FormData) => void | Promise<void>;
  deleteAction: (tag: string) => void | Promise<void>;
}) {
  const [editingTag, setEditingTag] = useState<string | null>(null);

  if (tags.length === 0) {
    return <p className="text-sm text-base-content/50">No tags used yet — add some from the blog post editor.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-base-300 bg-base-100">
      <table className="table">
        <thead>
          <tr>
            <th>Tag</th>
            <th>Posts</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {tags.map(({ tag, count }) => (
            <tr key={tag}>
              <td>
                {editingTag === tag ? (
                  <form
                    action={(formData) => {
                      renameAction(tag, formData);
                      setEditingTag(null);
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      name="newTag"
                      defaultValue={tag}
                      autoFocus
                      className="input input-bordered input-xs"
                    />
                    <button type="submit" className="btn btn-primary btn-xs">
                      Save
                    </button>
                    <button type="button" onClick={() => setEditingTag(null)} className="btn btn-ghost btn-xs">
                      Cancel
                    </button>
                  </form>
                ) : (
                  tag
                )}
              </td>
              <td>{count}</td>
              <td className="text-right">
                {editingTag !== tag && (
                  <div className="flex items-center justify-end gap-3">
                    <button type="button" onClick={() => setEditingTag(tag)} className="text-sm text-primary hover:underline">
                      Rename
                    </button>
                    <form
                      action={deleteAction.bind(null, tag)}
                      onSubmit={(event) => {
                        if (!window.confirm(`Remove tag "${tag}" from ${count} post(s)?`)) {
                          event.preventDefault();
                        }
                      }}
                    >
                      <button type="submit" className="text-sm text-error hover:underline">
                        Delete
                      </button>
                    </form>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
