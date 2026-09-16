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

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-4 border-t border-(--border) bg-white/50 p-4 dark:bg-white/5",
        className
      )}
    >
      <div className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
        Showing {startItem}–{endItem} of {totalItems}
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

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
            className="h-9 px-3 text-xs font-semibold"
          >
            <ChevronLeft size={16} className="mr-1" /> Previous
          </Button>

          <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 px-1">
            Page {displayPage} of {totalPages}
          </span>

          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages || loading}
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
