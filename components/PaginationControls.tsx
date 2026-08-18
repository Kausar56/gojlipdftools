"use client";

export function PaginationControls({
  currentPage,
  pageCount,
  onPrevious,
  onNext,
}: {
  currentPage: number;
  pageCount: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (pageCount <= 1) return null;

  return (
    <div className="mt-3 flex items-center justify-center gap-3 text-sm">
      <button type="button" onClick={onPrevious} disabled={currentPage === 0} className="btn btn-ghost btn-xs">
        Previous
      </button>
      <span className="text-base-content/60">
        Page {currentPage + 1} of {pageCount}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={currentPage === pageCount - 1}
        className="btn btn-ghost btn-xs"
      >
        Next
      </button>
    </div>
  );
}
