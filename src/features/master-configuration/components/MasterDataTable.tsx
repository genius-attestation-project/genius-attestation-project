"use client";

import { useState } from "react";
import { Edit2, Search, Trash2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Column = {
  header: string;
  accessorKey: string;
  cell?: (item: any) => React.ReactNode;
};

type MasterDataTableProps = {
  columns: Column[];
  data: any[];
  isLoading?: boolean;
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  onToggleStatus?: (item: any) => void;
  searchPlaceholder?: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
};

export function MasterDataTable({
  columns,
  data,
  isLoading,
  onEdit,
  onDelete,
  onToggleStatus,
  searchPlaceholder = "Search records...",
  searchQuery,
  onSearchChange,
}: MasterDataTableProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
      {/* Table Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-white/5">
        <div className="relative w-full max-w-sm">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm transition-colors focus:border-blue-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-blue-500"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-white/5 dark:text-slate-400">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className="px-6 py-4">
                  {col.header}
                </th>
              ))}
              {(onEdit || onDelete || onToggleStatus) && (
                <th className="px-6 py-4 text-right">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white dark:divide-white/5 dark:bg-transparent">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length + 1} className="p-8 text-center text-slate-500">
                  Loading records...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="p-8 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <ShieldAlert size={32} className="text-slate-300" />
                    <p>No records found matching your criteria.</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item, rowIdx) => (
                <tr
                  key={item.id || rowIdx}
                  className="transition-colors hover:bg-slate-50/50 dark:hover:bg-white/5"
                >
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className="px-6 py-4 text-slate-700 dark:text-slate-300">
                      {col.cell ? col.cell(item) : item[col.accessorKey]}
                    </td>
                  ))}
                  {(onEdit || onDelete || onToggleStatus) && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {onToggleStatus && (
                          <button
                            onClick={() => onToggleStatus(item)}
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                              item.isActive
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-400"
                            }`}
                          >
                            {item.isActive ? "Active" : "Inactive"}
                          </button>
                        )}
                        {onEdit && (
                          <Button variant="ghost" size="sm" onClick={() => onEdit(item)} className="h-8 w-8 p-0">
                            <Edit2 size={14} />
                          </Button>
                        )}
                        {onDelete && (
                          <Button variant="ghost" size="sm" onClick={() => onDelete(item)} className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10">
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
