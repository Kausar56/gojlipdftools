"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import type { TagUsage } from "@/lib/blogTags";
import { describeError } from "@/lib/errorHelpers";

function RenameTagForm({
  tag,
  renameAction,
  onDone,
}: {
  tag: string;
  renameAction: (oldTag: string, formData: FormData) => void | Promise<void>;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        await renameAction(tag, formData);
        toast.success(`Tag "${tag}" renamed.`);
        onDone();
      } catch (error) {
        toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't rename this tag."));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input type="text" name="newTag" defaultValue={tag} autoFocus className="input input-bordered input-xs" />
      <button type="submit" disabled={isPending} className="btn btn-primary btn-xs">
        {isPending ? "Saving..." : "Save"}
      </button>
      <button type="button" onClick={onDone} disabled={isPending} className="btn btn-ghost btn-xs">
        Cancel
      </button>
    </form>
  );
}

function DeleteTagButton({
  tag,
  count,
  deleteAction,
}: {
  tag: string;
  count: number;
  deleteAction: (tag: string) => void | Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm(`Remove tag "${tag}" from ${count} post(s)?`)) return;
    startTransition(async () => {
      try {
        await deleteAction(tag);
        toast.success(`Tag "${tag}" removed.`);
      } catch (error) {
        toast.error(describeError(error, error instanceof Error ? error.message : "Couldn't remove this tag."));
      }
    });
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className="text-sm text-error hover:underline">
      Delete
    </button>
  );
}

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
                  <RenameTagForm tag={tag} renameAction={renameAction} onDone={() => setEditingTag(null)} />
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
                    <DeleteTagButton tag={tag} count={count} deleteAction={deleteAction} />
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
