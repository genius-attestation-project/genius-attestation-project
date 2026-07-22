"use client";

import { ReactNode } from "react";
import { Plus, RefreshCw, Download, FileDown } from "lucide-react";
import { Button } from "@/components/ui/Button";

type MasterLayoutProps = {
  title: string;
  description: string;
  totalRecords: number;
  activeRecords: number;
  inactiveRecords: number;
  onAdd: () => void;
  onRefresh: () => void;
  onExportExcel?: () => void;
  onExportCsv?: () => void;
  children: ReactNode;
};

export function MasterLayout({
  title,
  description,
  totalRecords,
  activeRecords,
  inactiveRecords,
  onAdd,
  onRefresh,
  onExportExcel,
  onExportCsv,
  children,
}: MasterLayoutProps) {
  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      {/* Header Section */}
      <section className="relative rounded-3xl border border-blue-100 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_50%),linear-gradient(135deg,#ffffff,#f8fafc)] p-6 shadow-sm sm:p-8 dark:border-white/5 dark:bg-none dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
              Master Configuration
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
              {description}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={onRefresh} title="Refresh Data">
              <RefreshCw size={16} className="mr-2" /> Refresh
            </Button>
            {(onExportExcel || onExportCsv) && (
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-1 dark:bg-slate-800">
                {onExportExcel && (
                  <Button variant="ghost" size="sm" onClick={onExportExcel}>
                    <FileDown size={16} className="mr-2" /> Excel
                  </Button>
                )}
                {onExportCsv && (
                  <Button variant="ghost" size="sm" onClick={onExportCsv}>
                    <Download size={16} className="mr-2" /> CSV
                  </Button>
                )}
              </div>
            )}
            <Button onClick={onAdd} className="bg-blue-600 text-white hover:bg-blue-700">
              <Plus size={16} className="mr-2" /> Add New
            </Button>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Records</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{totalRecords}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">{activeRecords}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Inactive</p>
          <p className="mt-2 text-3xl font-bold text-slate-400 dark:text-slate-500">{inactiveRecords}</p>
        </div>
      </section>

      {/* Content Section */}
      <section className="min-w-0">
        {children}
      </section>
    </div>
  );
}
