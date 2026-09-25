"use client";

import React, { useState, useEffect, useCallback, FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search,
  RotateCcw,
  Download,
  Building2,
  Calendar,
  FileSearch,
  FileText,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  Eye,
  Route,
  Printer,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { TablePagination } from "@/components/ui/TablePagination";
import { LiveTimelineModal } from "@/features/registration/components/LiveTimelineModal";
import type {
  DocumentReportItem,
  DocumentReportSummary,
  DocumentReportResult,
} from "@/features/registration/server/document-report.service";

interface OfficeOption {
  id: string;
  officeName: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function SearchReportClient() {
  const searchParams = useSearchParams();
  const initialTrackingNumber = searchParams.get("trackingNumber") || "";
  const initialOffice = searchParams.get("office") || "";

  const [offices, setOffices] = useState<OfficeOption[]>([]);
  const [selectedOffice, setSelectedOffice] = useState<string>(initialOffice);
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [searchKeyword, setSearchKeyword] = useState<string>(initialTrackingNumber);

  const [items, setItems] = useState<DocumentReportItem[]>([]);
  const [summary, setSummary] = useState<DocumentReportSummary | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [timelineTrackingNumber, setTimelineTrackingNumber] = useState<string | null>(null);

  // Load authorized offices for the search_report module
  useEffect(() => {
    let mounted = true;
    async function loadAuthorizedOffices() {
      try {
        const res = await fetch("/api/offices/all?module=search_report", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          const list: OfficeOption[] = json.offices || json.data || [];
          if (mounted) {
            setOffices(list);
            // If user has access to exactly 1 office and none selected yet, auto-select it
            if (list.length === 1 && !selectedOffice) {
              setSelectedOffice(list[0].officeName);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load authorized offices:", err);
      }
    }
    loadAuthorizedOffices();
    return () => {
      mounted = false;
    };
  }, []);

  const performSearch = useCallback(
    async (pageToLoad = 1, pageSizeToLoad = pagination.pageSize) => {
      if (!selectedOffice.trim()) {
        setError("Please select an office to generate the document report.");
        return;
      }

      setLoading(true);
      setError("");
      setHasSearched(true);

      try {
        const params = new URLSearchParams();
        params.set("office", selectedOffice.trim());
        params.set("page", String(pageToLoad));
        params.set("pageSize", String(pageSizeToLoad));
        if (fromDate.trim()) params.set("fromDate", fromDate.trim());
        if (toDate.trim()) params.set("toDate", toDate.trim());
        if (searchKeyword.trim()) params.set("search", searchKeyword.trim());

        const res = await fetch(`/api/search-report?${params.toString()}`, {
          cache: "no-store",
        });
        const data: { success?: boolean; data?: DocumentReportResult; message?: string } = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to fetch document report.");
        }

        const reportData = data.data || (data as unknown as DocumentReportResult);
        setItems(reportData.items || []);
        setSummary(reportData.summary || null);
        setPagination({
          page: reportData.pagination?.page || 1,
          pageSize: reportData.pagination?.pageSize || pageSizeToLoad,
          totalItems: reportData.pagination?.totalItems || 0,
          totalPages: reportData.pagination?.totalPages || 1,
        });
      } catch (err: any) {
        setError(err?.message || "Failed to load document report.");
        setItems([]);
        setSummary(null);
      } finally {
        setLoading(false);
      }
    },
    [selectedOffice, fromDate, toDate, searchKeyword, pagination.pageSize]
  );

  // Auto-trigger initial search if office was passed or pre-selected
  useEffect(() => {
    if (initialOffice) {
      setSelectedOffice(initialOffice);
    }
  }, [initialOffice]);

  function handleFormSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void performSearch(1, pagination.pageSize);
  }

  function handleReset() {
    setFromDate("");
    setToDate("");
    setSearchKeyword("");
    setError("");
    setHasSearched(false);
    setItems([]);
    setSummary(null);
    setPagination({
      page: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 1,
    });
    if (offices.length !== 1) {
      setSelectedOffice("");
    }
  }

  // Date Presets
  function setDatePreset(type: "today" | "thisMonth" | "lastMonth") {
    const now = new Date();
    if (type === "today") {
      const todayStr = now.toISOString().split("T")[0];
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (type === "thisMonth") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
      setFromDate(firstDay);
      setToDate(lastDay);
    } else if (type === "lastMonth") {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];
      setFromDate(firstDay);
      setToDate(lastDay);
    }
  }

  async function handleExportExcel() {
    if (!selectedOffice.trim()) {
      setError("Please select an office to export the report.");
      return;
    }

    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.set("office", selectedOffice.trim());
      if (fromDate.trim()) params.set("fromDate", fromDate.trim());
      if (toDate.trim()) params.set("toDate", toDate.trim());
      if (searchKeyword.trim()) params.set("search", searchKeyword.trim());

      const url = `/api/search-report/export?${params.toString()}`;
      window.open(url, "_blank");
    } catch (err: any) {
      console.error("Export error:", err);
      setError(err?.message || "Failed to export report.");
    } finally {
      setExporting(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              <FileSearch className="h-3.5 w-3.5" /> Search &amp; Reports
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Document Report
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Generate and view financial reports of registered documents by selected office and date range.
          </p>
        </div>

        {hasSearched && items.length > 0 && (
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
            >
              <Printer className="h-4 w-4 text-slate-500" /> Print
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleExportExcel}
              disabled={exporting}
              className="gap-1.5 bg-emerald-600 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
            >
              <Download className="h-4 w-4" /> {exporting ? "Exporting..." : "Export Excel"}
            </Button>
          </div>
        )}
      </div>

      {/* Filter Card */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-slate-900">
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
            {/* 1. Office Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-blue-500" />
                Office <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedOffice}
                onChange={(e) => setSelectedOffice(e.target.value)}
                required
                className="w-full h-10 rounded-2xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                <option value="">-- Select Office --</option>
                {offices.map((loc) => (
                  <option key={loc.id} value={loc.officeName}>
                    {loc.officeName}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. From Date */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-blue-500" />
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full h-10 rounded-2xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>

            {/* 3. To Date */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-blue-500" />
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full h-10 rounded-2xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>

            {/* 4. Tracking Number (Optional Search) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-blue-500" />
                Tracking Number / Keyword
              </label>
              <input
                type="text"
                placeholder="e.g. TRK-9846 or name"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full h-10 rounded-2xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>
          </div>

          {/* Quick Date Presets & Action Buttons */}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 dark:border-white/5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mr-1">
                Quick Presets:
              </span>
              <button
                type="button"
                onClick={() => setDatePreset("today")}
                className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 transition-all cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("thisMonth")}
                className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 transition-all cursor-pointer"
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("lastMonth")}
                className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 transition-all cursor-pointer"
              >
                Last Month
              </button>
              {(fromDate || toDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setFromDate("");
                    setToDate("");
                  }}
                  className="rounded-xl px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
                >
                  Clear Dates
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleReset}
                disabled={loading}
                className="gap-1.5 border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={loading || !selectedOffice}
                className="gap-1.5 bg-blue-600 px-5 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
              >
                <Search className="h-4 w-4" /> {loading ? "Searching..." : "Search"}
              </Button>
            </div>
          </div>
        </form>

        {error ? (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-700 dark:text-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        ) : null}
      </div>

      {/* Summary KPI Cards */}
      {hasSearched && summary && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-3.5 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-slate-900">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Total Documents
              </p>
              <p className="text-xl font-black text-slate-900 dark:text-white">
                {summary.totalDocuments}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-slate-900">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
              <IndianRupee className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Total Charges
              </p>
              <p className="text-xl font-black text-slate-900 dark:text-white">
                {formatCurrency(summary.totalCharges)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-slate-900">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Advance Amount
              </p>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                {formatCurrency(summary.totalAdvance)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-slate-900">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Balance Amount
              </p>
              <p className="text-xl font-black text-amber-600 dark:text-amber-400">
                {formatCurrency(summary.totalBalance)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Report Table Card */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs dark:border-white/10 dark:bg-slate-900">
        <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3.5 dark:border-white/5 dark:bg-white/5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Document Report Results {hasSearched && `(${pagination.totalItems})`}
            </h3>
            {selectedOffice && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400">
                <Building2 className="h-3.5 w-3.5" />
                {selectedOffice}
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <p className="mt-2">Generating document report...</p>
          </div>
        ) : !hasSearched ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <FileSearch className="h-6 w-6" />
            </div>
            <h4 className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
              Ready to Generate Report
            </h4>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Select an office and date range above, then click Search to view all registered documents and financial figures.
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={FileSearch}
              title="No documents found"
              description={`No document registrations found matching the criteria for ${selectedOffice}.`}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-white/10 dark:bg-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <th className="py-3 px-4 w-16 text-center">Sl No</th>
                  <th className="py-3 px-4">Tracking Number</th>
                  <th className="py-3 px-4 text-right">Total Charges</th>
                  <th className="py-3 px-4 text-right">Advance Amount</th>
                  <th className="py-3 px-4 text-right">Balance Amount</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/75 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3.5 px-4 text-center font-bold text-slate-500 dark:text-slate-400">
                      {item.slNo}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <Link
                          href={`/dashboard/document-details/${encodeURIComponent(item.trackingNumber)}`}
                          className="font-mono font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline inline-flex items-center gap-1"
                        >
                          {item.trackingNumber}
                          <ChevronRight className="h-3 w-3 opacity-60" />
                        </Link>
                        {item.customerName && item.customerName !== "-" && (
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            {item.customerName}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(item.totalCharges)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(item.advanceAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold">
                      <span
                        className={
                          item.balanceAmount > 0
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-slate-500 dark:text-slate-400"
                        }
                      >
                        {formatCurrency(item.balanceAmount)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <Link
                          href={`/dashboard/document-details/${encodeURIComponent(item.trackingNumber)}`}
                          title="View 360° Details"
                        >
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 px-2 text-[11px] gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                          >
                            <Eye className="h-3.5 w-3.5" /> 360°
                          </Button>
                        </Link>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setTimelineTrackingNumber(item.trackingNumber)}
                          title="View Timeline"
                          className="h-7 px-2 text-[11px] gap-1 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                        >
                          <Route className="h-3.5 w-3.5" /> Timeline
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {summary && items.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-100/60 dark:border-white/10 dark:bg-white/10 font-black text-xs text-slate-900 dark:text-white">
                    <td colSpan={2} className="py-3.5 px-4 uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Grand Total ({summary.totalDocuments} Records)
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {formatCurrency(summary.totalCharges)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(summary.totalAdvance)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-amber-600 dark:text-amber-400">
                      {formatCurrency(summary.totalBalance)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* Server-Side Pagination */}
        {hasSearched && items.length > 0 && (
          <TablePagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            totalItems={pagination.totalItems}
            totalPages={pagination.totalPages}
            loading={loading}
            onPageChange={(newPage) => void performSearch(newPage, pagination.pageSize)}
            onPageSizeChange={(newPageSize) => void performSearch(1, newPageSize)}
            pageSizeOptions={[10, 20, 50, 100]}
          />
        )}
      </div>

      {/* Live Timeline Modal */}
      {timelineTrackingNumber && (
        <LiveTimelineModal
          isOpen={!!timelineTrackingNumber}
          onClose={() => setTimelineTrackingNumber(null)}
          trackingNumber={timelineTrackingNumber}
        />
      )}
    </div>
  );
}
