"use client";

import React from "react";
import { Building2, Calendar, Search } from "lucide-react";

export const EmptyState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/60 p-12 text-center shadow-xs dark:border-white/10 dark:bg-slate-900/40">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-600 shadow-md shadow-blue-500/10 dark:bg-blue-950/60 dark:text-blue-400">
        <Building2 className="h-8 w-8" />
      </div>

      <h3 className="mt-5 text-lg font-black text-slate-900 dark:text-white">
        Select Filters to View Account Statements
      </h3>

      <p className="mt-2 max-w-md text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
        Please select an <span className="font-bold text-slate-700 dark:text-slate-200">Office</span>,{" "}
        <span className="font-bold text-slate-700 dark:text-slate-200">From Date</span>, and{" "}
        <span className="font-bold text-slate-700 dark:text-slate-200">To Date</span> above, then click{" "}
        <span className="font-bold text-blue-600 dark:text-blue-400">SEARCH</span> to load office financial records.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
        <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 dark:bg-white/5">
          <Building2 className="h-3.5 w-3.5 text-blue-500" />
          1. Select Office Location
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 dark:bg-white/5">
          <Calendar className="h-3.5 w-3.5 text-indigo-500" />
          2. Set Date Range
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 dark:bg-white/5">
          <Search className="h-3.5 w-3.5 text-emerald-500" />
          3. Click Search
        </div>
      </div>
    </div>
  );
};
