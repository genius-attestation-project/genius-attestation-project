"use client";

import { ReactNode } from "react";
import { Plus, RefreshCw, Download, FileDown, Activity, Layers, Ban } from "lucide-react";
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
    <div className="grid min-w-0 gap-5 sm:gap-6">
      {/* Premium Header Section */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.02)] sm:p-7 dark:border-white/10 dark:bg-[#0f1115]">
        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-blue-600 to-blue-400" />
        
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
              Master Configuration
            </p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              {title}
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {description}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              variant="secondary" 
              onClick={onRefresh} 
              title="Refresh Data"
              className="h-9 rounded-full border-slate-200/60 px-4 text-xs font-semibold shadow-sm hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
            >
              <RefreshCw size={14} className="mr-2" /> Refresh
            </Button>
            
            {(onExportExcel || onExportCsv) && (
              <div className="flex items-center gap-1 rounded-full border border-slate-200/60 bg-slate-50/50 p-1 shadow-sm dark:border-white/10 dark:bg-white/5">
                {onExportExcel && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onExportExcel}
                    className="h-7 rounded-full px-3 text-xs font-semibold hover:bg-white hover:shadow-sm dark:hover:bg-white/10"
                  >
                    <FileDown size={14} className="mr-1.5" /> Excel
                  </Button>
                )}
                {onExportCsv && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onExportCsv}
                    className="h-7 rounded-full px-3 text-xs font-semibold hover:bg-white hover:shadow-sm dark:hover:bg-white/10"
                  >
                    <Download size={14} className="mr-1.5" /> CSV
                  </Button>
                )}
              </div>
            )}
            
            <Button 
              onClick={onAdd} 
              className="h-9 rounded-full bg-blue-600 px-4 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-700 hover:shadow-blue-500/30"
            >
              <Plus size={16} className="mr-1.5" /> Add New
            </Button>
          </div>
        </div>
      </section>

      {/* Metrics Section */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.02)] transition-shadow hover:shadow-md dark:border-white/10 dark:bg-[#0f1115]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400">
              <Layers size={20} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Records</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{totalRecords}</p>
            </div>
          </div>
        </div>
        
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.02)] transition-shadow hover:shadow-md dark:border-white/10 dark:bg-[#0f1115]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <Activity size={20} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Active</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{activeRecords}</p>
            </div>
          </div>
        </div>
        
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.02)] transition-shadow hover:shadow-md dark:border-white/10 dark:bg-[#0f1115]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400 dark:bg-white/5 dark:text-slate-500">
              <Ban size={20} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Inactive</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{inactiveRecords}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="min-w-0">
        {children}
      </section>
    </div>
  );
}
