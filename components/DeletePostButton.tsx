"use client";

export function DeletePostButton({
  action,
  className = "btn btn-outline btn-error btn-sm",
}: {
  action: () => Promise<void>;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm("Delete this post? This can't be undone.")) {
          event.preventDefault();
        }
      }}
    >
      <button type="submit" className={className}>
        Delete
      </button>
    </form>
  );
}
