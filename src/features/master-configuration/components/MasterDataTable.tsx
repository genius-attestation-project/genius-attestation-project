"use client";

import { useState } from "react";
import { Edit2, Search, Trash2, ShieldAlert, CircleCheck, CircleMinus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";

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
  filterComponent?: React.ReactNode;
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
  filterComponent,
}: MasterDataTableProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-[0_2px_12px_-4px_rgba(0,0,0,0.02)] dark:border-white/10 dark:bg-[#0f1115]">
      {/* Table Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-3 sm:p-4 dark:border-white/5">
        <div className="relative w-full max-w-md group">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200/60 bg-slate-50/50 pl-10 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-[#13151a]"
          />
        </div>
        {filterComponent && (
          <div className="flex items-center gap-2">
            {filterComponent}
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-white/5 dark:bg-white/5 dark:text-slate-400">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className="px-6 py-3.5">
                  {col.header}
                </th>
              ))}
              {(onEdit || onDelete || onToggleStatus) && (
                <th className="px-6 py-3.5 text-right">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/80 bg-white dark:divide-white/5 dark:bg-transparent">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length + 1} className="p-12 text-center text-sm font-medium text-slate-500">
                  <div className="flex items-center justify-center gap-3 animate-pulse">
                    <div className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-blue-600 animate-spin" />
                    Loading records...
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="p-16 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 dark:bg-white/5">
                      <ShieldAlert size={28} />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-900 dark:text-white">No records found</p>
                      <p className="text-sm text-slate-500">We couldn't find anything matching your search criteria.</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item, rowIdx) => (
                <tr
                  key={item.id || rowIdx}
                  className="group transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.02]"
                >
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className="px-6 py-4 text-slate-700 dark:text-slate-300 font-medium">
                      {col.cell ? col.cell(item) : item[col.accessorKey]}
                    </td>
                  ))}
                  {(onEdit || onDelete || onToggleStatus) && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        {onToggleStatus && (
                          <button
                            onClick={() => onToggleStatus(item)}
                            title="Toggle Status"
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold transition-colors",
                              item.isActive
                                ? "border-emerald-200/60 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                                : "border-slate-200/60 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
                            )}
                          >
                            {item.isActive ? (
                              <><CircleCheck size={12} /> Active</>
                            ) : (
                              <><CircleMinus size={12} /> Inactive</>
                            )}
                          </button>
                        )}
                        {onEdit && (
                          <button 
                            title="Edit"
                            onClick={() => onEdit(item)} 
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
                          >
                            <Edit2 size={15} className="transition-transform group-hover/btn:scale-110" />
                          </button>
                        )}
                        {onDelete && (
                          <button 
                            title="Delete"
                            onClick={() => onDelete(item)} 
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                          >
                            <Trash2 size={15} className="transition-transform group-hover/btn:scale-110" />
                          </button>
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
