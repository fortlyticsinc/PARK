// frontend/src/components/ui/Pagination.tsx
/**
 * PARK — Pagination Component
 * Mobile-optimized, thumb-reachable.
 */
import { Button } from "./Button";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visiblePages = pages.slice(
    Math.max(0, currentPage - 2),
    Math.min(totalPages, currentPage + 1)
  );

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        Previous
      </Button>

      {currentPage > 3 && <span className="px-2 text-stone-600">...</span>}

      {visiblePages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={cn(
            "h-9 w-9 rounded-lg text-sm font-medium transition-colors",
            page === currentPage
              ? "bg-sage-600 text-white"
              : "text-stone-400 hover:bg-stone-800 hover:text-stone-200"
          )}
        >
          {page}
        </button>
      ))}

      {currentPage < totalPages - 2 && (
        <span className="px-2 text-stone-600">...</span>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
      >
        Next
      </Button>
    </div>
  );
}
