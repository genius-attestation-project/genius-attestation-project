"use client";

import React, { useEffect, useState } from "react";
import { Search, RotateCcw, Printer, Building2, Calendar } from "lucide-react";

interface OfficeLocationItem {
  id: string;
  officeName: string;
}

interface StatementFiltersProps {
  office: string;
  fromDate: string;
  toDate: string;
  search: string;
  hasSearched?: boolean;
  onOfficeChange: (office: string) => void;
  onFromDateChange: (date: string) => void;
  onToDateChange: (date: string) => void;
  onSearchChange: (search: string) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
  onPrint: () => void;
  loading?: boolean;
}

export const StatementFilters: React.FC<StatementFiltersProps> = ({
  office,
  fromDate,
  toDate,
  search,
  hasSearched = false,
  onOfficeChange,
  onFromDateChange,
  onToDateChange,
  onSearchChange,
  onApplyFilters,
  onResetFilters,
  onPrint,
  loading = false,
}) => {
  const [offices, setOffices] = useState<OfficeLocationItem[]>([]);

  useEffect(() => {
    let mounted = true;
    async function loadOffices() {
      try {
        const res = await fetch("/api/office-locations", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (mounted && json.officeLocations) {
            setOffices(json.officeLocations);
          }
        }
      } catch (err) {
        console.error("Failed to load office locations:", err);
      }
    }
    loadOffices();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-slate-900">
      {/* Top Title & Print Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-white/5">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Accounts Statements
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Unified financial report of cash & non-cash advances, credit accounts, and debit expenditures.
          </p>
        </div>

        {hasSearched && (
          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 transition-all cursor-pointer"
          >
            <Printer className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            Print / Export
          </button>
        )}
      </div>

      {/* Main Filter Controls */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
        {/* Office Dropdown (Strict Real Offices Only) */}
        <div className="space-y-1.5 lg:col-span-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-blue-500" />
            Office *
          </label>
          <select
            value={office}
            onChange={(e) => onOfficeChange(e.target.value)}
            className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/60 px-3.5 py-2 text-xs font-medium text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            <option value="">Select Office...</option>
            {offices.map((off) => (
              <option key={off.id} value={off.officeName}>
                {off.officeName}
              </option>
            ))}
          </select>
        </div>

        {/* From Date */}
        <div className="space-y-1.5 lg:col-span-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-blue-500" />
            From Date *
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => onFromDateChange(e.target.value)}
            className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/60 px-3.5 py-2 text-xs font-medium text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>

        {/* To Date */}
        <div className="space-y-1.5 lg:col-span-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-blue-500" />
            To Date *
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => onToDateChange(e.target.value)}
            className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/60 px-3.5 py-2 text-xs font-medium text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 lg:col-span-1">
          <button
            type="button"
            onClick={onApplyFilters}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <Search className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            SEARCH
          </button>

          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 transition-all cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            RESET
          </button>
        </div>
      </div>

      {/* Conditional Post-Search Filter Input Box */}
      {hasSearched && (
        <div className="pt-2 border-t border-slate-100 dark:border-white/5">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter loaded transactions by invoice, person, or narration..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/80 pl-10 pr-4 py-2 text-xs font-medium text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
        </div>
      )}
    </div>
  );
};
