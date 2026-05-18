import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

type DataTableColumn<T> = {
  key: keyof T | string;
  label: string;
  className?: string;
  render?: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  keyField: keyof T;
  className?: string;
};

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  keyField,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn("overflow-hidden rounded-[28px] border border-[color:var(--border)]", className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-blue-50 text-xs font-semibold uppercase tracking-[0.16em] text-soft dark:bg-blue-500/10">
            <tr>
              {columns.map((column) => (
                <th key={String(column.key)} className={cn("px-5 py-4", column.className)}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--border)] bg-white/70 dark:bg-white/5">
            {rows.map((row) => (
              <tr key={String(row[keyField])} className="transition hover:bg-blue-50 dark:hover:bg-blue-500/5">
                {columns.map((column) => (
                  <td key={String(column.key)} className={cn("px-5 py-4 align-middle", column.className)}>
                    {column.render ? column.render(row) : String(row[column.key as keyof T] ?? "-")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
