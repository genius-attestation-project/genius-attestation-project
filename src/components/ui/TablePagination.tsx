"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";

export interface TablePaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  loading?: boolean;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newPageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 50, 100, 150, 200, 250, 300, 400, 500, 750, 1000];

function getPageNumbers(currentPage: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
}

export function TablePagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  loading = false,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  className,
}: TablePaginationProps) {
  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);
  const displayPage = totalPages === 0 ? 0 : page;
  const pageNumbers = totalPages > 0 ? getPageNumbers(page, totalPages) : [];

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-4 border-t border-(--border) bg-white/50 p-4 dark:bg-white/5",
        className
      )}
    >
      <div className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
        Showing {startItem}–{endItem} of {totalItems} records
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-medium text-soft">Rows per page:</span>
          <select
            className="h-9 rounded-md border border-(--border) bg-transparent px-2.5 text-xs sm:text-sm outline-none dark:bg-white/5"
            value={pageSize}
            disabled={loading}
            onChange={(e) => {
              const newSize = Number(e.target.value);
              onPageSizeChange(newSize);
            }}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
            className="h-9 px-3 text-xs font-semibold"
          >
            <ChevronLeft size={16} className="mr-1" /> Previous
          </Button>

          {/* Desktop/Tablet Numeric Pagination */}
          <div className="hidden sm:flex items-center gap-1 px-1">
            {pageNumbers.map((p, idx) =>
              p === "..." ? (
                <span key={`ellipsis-${idx}`} className="px-1.5 text-xs font-semibold text-soft">
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  disabled={loading}
                  onClick={() => onPageChange(p as number)}
                  className={cn(
                    "h-8 min-w-8 rounded-lg px-2 text-xs font-bold transition cursor-pointer",
                    page === p
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
                  )}
                >
                  {p}
                </button>
              )
            )}
          </div>

          {/* Mobile Display */}
          <span className="sm:hidden text-xs font-semibold text-slate-700 dark:text-slate-200 px-2">
            Page {displayPage} of {totalPages}
          </span>

          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages || loading || totalPages === 0}
            onClick={() => onPageChange(page + 1)}
            className="h-9 px-3 text-xs font-semibold"
          >
            Next <ChevronRight size={16} className="ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
