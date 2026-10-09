"use client";

import React, { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import Link from "next/link";
import {
  FileSearch,
  Search,
  Filter,
  FileSpreadsheet,
  RefreshCw,
  X,
  Building2,
  Calendar,
  DollarSign,
  FileText,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchableSelect, type SelectOption } from "@/components/ui/SearchableSelect";
import type { TrackingReportResult } from "@/features/registration/server/tracking-report.service";

type TrackingReportClientProps = {
  canExport?: boolean;
};

type FilterState = {
  trackingNumber: string;
  customerName: string;
  mobile: string;
  registeredPerson: string;
  collectedPerson: string;
  documentType: string;
  processType: string;
  status: string;
  hasBalance: string;
};

const initialFilters: FilterState = {
  trackingNumber: "",
  customerName: "",
  mobile: "",
  registeredPerson: "",
  collectedPerson: "",
  documentType: "",
  processType: "",
  status: "",
  hasBalance: "",
};

function formatCurrency(amount: number): string {
  return Number(amount || 0).toLocaleString("en-IN");
}

export function TrackingReportClient({ canExport = true }: TrackingReportClientProps) {
  const [office, setOffice] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  const [officeOptions, setOfficeOptions] = useState<SelectOption[]>([]);
  const [officesLoading, setOfficesLoading] = useState<boolean>(true);

  const [documentTypeOptions, setDocumentTypeOptions] = useState<SelectOption[]>([]);
  const [processTypeOptions, setProcessTypeOptions] = useState<SelectOption[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [searched, setSearched] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [exporting, setExporting] = useState<boolean>(false);

  const [reportData, setReportData] = useState<TrackingReportResult | null>(null);

  // 1. Fetch office options respecting Office Visibility Access
  useEffect(() => {
    async function loadOfficeOptions() {
      setOfficesLoading(true);
      try {
        const res = await fetch("/api/offices/all?module=search_report", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const officesList: Array<{ id: string; officeName: string; location?: string }> =
            data.offices ?? data.data ?? [];

          const opts: SelectOption[] = [];

          // If multiple offices are available, include "All Offices" option
          if (officesList.length > 1) {
            opts.push({
              label: "All Offices",
              value: "all",
            });
          }

          officesList.forEach((o) => {
            opts.push({
              label: o.officeName,
              value: o.id,
            });
          });

          setOfficeOptions(opts);

          // If exactly 1 office is available, pre-select it
          if (officesList.length === 1) {
            setOffice(officesList[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load office options:", err);
      } finally {
        setOfficesLoading(false);
      }
    }

    async function loadMasterFilters() {
      try {
        const [docRes, procRes] = await Promise.all([
          fetch("/api/master-data/document-types?active=true"),
          fetch("/api/master-data/process-types?active=true"),
        ]);
        if (docRes.ok) {
          const d = await docRes.json();
          setDocumentTypeOptions(
            (d.items || []).map((i: any) => ({ label: i.name, value: i.name }))
          );
        }
        if (procRes.ok) {
          const p = await procRes.json();
          setProcessTypeOptions(
            (p.items || []).map((i: any) => ({ label: i.name, value: i.name }))
          );
        }
      } catch (e) {
        console.error("Failed to load master filters:", e);
      }
    }

    void loadOfficeOptions();
    void loadMasterFilters();
  }, []);

  // 2. Perform Search
  const handleSearch = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();

      if (!office) {
        setError("Please select an office to search.");
        return;
      }

      if (fromDate && toDate && fromDate > toDate) {
        setError("From Date cannot be later than To Date.");
        return;
      }

      setLoading(true);
      setError("");
      setSearched(true);

      try {
        const params = new URLSearchParams();
        params.set("office", office);
        if (fromDate) params.set("fromDate", fromDate);
        if (toDate) params.set("toDate", toDate);

        if (filters.trackingNumber.trim()) params.set("trackingNumber", filters.trackingNumber.trim());
        if (filters.customerName.trim()) params.set("customerName", filters.customerName.trim());
        if (filters.mobile.trim()) params.set("mobile", filters.mobile.trim());
        if (filters.registeredPerson.trim()) params.set("registeredPerson", filters.registeredPerson.trim());
        if (filters.collectedPerson.trim()) params.set("collectedPerson", filters.collectedPerson.trim());
        if (filters.documentType) params.set("documentType", filters.documentType);
        if (filters.processType) params.set("processType", filters.processType);
        if (filters.status) params.set("status", filters.status);
        if (filters.hasBalance) params.set("hasBalance", filters.hasBalance);

        const res = await fetch(`/api/search-report/tracking-report?${params.toString()}`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.message || "Failed to fetch tracking report.");
        }

        setReportData(data.data ?? data);
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred while generating the report.");
        setReportData(null);
      } finally {
        setLoading(false);
      }
    },
    [office, fromDate, toDate, filters]
  );

  // 3. Clear Filters
  const handleClearFilters = () => {
    setFilters(initialFilters);
  };

  // 4. Excel Export
  const handleExport = async () => {
    if (!office) return;
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.set("office", office);
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);

      if (filters.trackingNumber.trim()) params.set("trackingNumber", filters.trackingNumber.trim());
      if (filters.customerName.trim()) params.set("customerName", filters.customerName.trim());
      if (filters.mobile.trim()) params.set("mobile", filters.mobile.trim());
      if (filters.registeredPerson.trim()) params.set("registeredPerson", filters.registeredPerson.trim());
      if (filters.collectedPerson.trim()) params.set("collectedPerson", filters.collectedPerson.trim());
      if (filters.documentType) params.set("documentType", filters.documentType);
      if (filters.processType) params.set("processType", filters.processType);
      if (filters.status) params.set("status", filters.status);
      if (filters.hasBalance) params.set("hasBalance", filters.hasBalance);

      const res = await fetch(`/api/search-report/tracking-report/export?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "Export failed.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Tracking_Report_${office}_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err: any) {
      alert(err.message || "Failed to export report.");
    } finally {
      setExporting(false);
    }
  };

  const hasResults = Boolean(reportData && reportData.items && reportData.items.length > 0);

  return (
    <div className="grid min-w-0 gap-6">
      {/* Main Filter / Search Bar */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-slate-900">
        <form onSubmit={handleSearch} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12 items-end">
          {/* Office Selection */}
          <div className="space-y-1.5 lg:col-span-4 min-w-0">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-blue-500" />
              Office *
            </label>
            <SearchableSelect
              placeholder="Select Office..."
              value={office}
              onChange={(val) => setOffice(val)}
              options={officeOptions}
              loading={officesLoading}
              groupByCategory={false}
              showDescription={false}
              triggerClassName="h-9 min-h-9 rounded-2xl border border-slate-200/80 bg-slate-50/60 px-3.5 py-2 text-xs font-medium text-slate-800 outline-none transition-all hover:border-slate-300 focus-within:border-blue-500 focus-within:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-white/20"
            />
          </div>

          {/* From Date */}
          <div className="space-y-1.5 lg:col-span-3 min-w-0">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-blue-500" />
              From Date *
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 min-h-9 w-full rounded-2xl border border-slate-200/80 bg-slate-50/60 px-3.5 py-2 text-xs font-medium text-slate-800 outline-none transition-all hover:border-slate-300 focus:border-blue-500 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-white/20"
            />
          </div>

          {/* To Date */}
          <div className="space-y-1.5 lg:col-span-3 min-w-0">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-blue-500" />
              To Date *
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 min-h-9 w-full rounded-2xl border border-slate-200/80 bg-slate-50/60 px-3.5 py-2 text-xs font-medium text-slate-800 outline-none transition-all hover:border-slate-300 focus:border-blue-500 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-white/20"
            />
          </div>

          {/* Action Buttons */}
          <div className="lg:col-span-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex-1 h-9 min-h-9 inline-flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                showFilters
                  ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300"
                  : "border-slate-200/80 bg-slate-50/60 text-slate-700 hover:bg-slate-100 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              }`}
              title="Toggle additional filters"
            >
              <Filter className="h-3.5 w-3.5" />
              Filters
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-9 min-h-9 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
              Search
            </button>
          </div>
        </form>

        {/* Expandable Filter Panel following Revenue Registration pattern */}
        {showFilters && (
          <div className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-(--border) bg-slate-50/90 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 dark:bg-slate-900/60 animate-in fade-in duration-150">
            <Input
              label="Tracking Number"
              placeholder="e.g. 609620"
              value={filters.trackingNumber}
              onChange={(e) => setFilters((f) => ({ ...f, trackingNumber: e.target.value }))}
            />
            <Input
              label="Customer Name"
              placeholder="Customer name"
              value={filters.customerName}
              onChange={(e) => setFilters((f) => ({ ...f, customerName: e.target.value }))}
            />
            <Input
              label="Mobile Number"
              placeholder="Mobile"
              value={filters.mobile}
              onChange={(e) => setFilters((f) => ({ ...f, mobile: e.target.value }))}
            />
            <Input
              label="Registered By"
              placeholder="Registered person"
              value={filters.registeredPerson}
              onChange={(e) => setFilters((f) => ({ ...f, registeredPerson: e.target.value }))}
            />
            <Input
              label="Collected By"
              placeholder="Collected person"
              value={filters.collectedPerson}
              onChange={(e) => setFilters((f) => ({ ...f, collectedPerson: e.target.value }))}
            />
            <SearchableSelect
              label="Document Type"
              placeholder="Select document"
              value={filters.documentType}
              onChange={(val) => setFilters((f) => ({ ...f, documentType: val }))}
              options={documentTypeOptions}
              groupByCategory={false}
            />
            <SearchableSelect
              label="Process Type"
              placeholder="Select process"
              value={filters.processType}
              onChange={(val) => setFilters((f) => ({ ...f, processType: val }))}
              options={processTypeOptions}
              groupByCategory={false}
            />
            <SearchableSelect
              label="Workflow Status"
              placeholder="Select status"
              value={filters.status}
              onChange={(val) => setFilters((f) => ({ ...f, status: val }))}
              options={[
                { label: "All Statuses", value: "" },
                { label: "Registered", value: "Registered" },
                { label: "Document In Hand", value: "Document In Hand" },
                { label: "In Transfer", value: "In Transfer" },
                { label: "Ready for Delivery", value: "Ready for Delivery" },
                { label: "Delivered", value: "Delivered" },
              ]}
              groupByCategory={false}
            />
            <SearchableSelect
              label="Balance Status"
              placeholder="Select balance"
              value={filters.hasBalance}
              onChange={(val) => setFilters((f) => ({ ...f, hasBalance: val }))}
              options={[
                { label: "All", value: "" },
                { label: "Has Balance", value: "true" },
                { label: "Fully Paid", value: "false" },
              ]}
              groupByCategory={false}
            />

            <div className="col-span-full flex justify-end gap-3 pt-2 border-t border-(--border)">
              <Button variant="ghost" onClick={handleClearFilters} size="sm">
                Clear Filters
              </Button>
              <Button onClick={() => void handleSearch()} size="sm" variant="primary">
                Apply Filters
              </Button>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700 dark:text-rose-200">
            {error}
          </p>
        )}
      </section>

      {/* Financial Summary Statistics Cards & Export */}
      {hasResults && reportData && (
        <div className="space-y-4">
          {canExport && (
            <div className="flex justify-end print:hidden">
              <Button
                variant="secondary"
                onClick={handleExport}
                disabled={exporting}
                className="gap-2 border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
              >
                {exporting ? (
                  <RefreshCw size={16} className="animate-spin text-emerald-600" />
                ) : (
                  <FileSpreadsheet size={16} className="text-emerald-600 dark:text-emerald-400" />
                )}
                Export to Excel
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Total Documents</span>
                <FileText size={18} className="text-blue-500" />
              </div>
              <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
                {reportData.summary.totalDocuments.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Total Charges</span>
                <DollarSign size={18} className="text-emerald-500" />
              </div>
              <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
                {formatCurrency(reportData.summary.totalCharges)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Total Paid</span>
                <DollarSign size={18} className="text-indigo-500" />
              </div>
              <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
                {formatCurrency(reportData.summary.totalPaid)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">Total Balance</span>
                <DollarSign size={18} className="text-amber-500" />
              </div>
              <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
                {formatCurrency(reportData.summary.totalBalance)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Content Area: Empty State, Loading, or Grouped Report Table */}
      {!searched && !loading ? (
        <EmptyState
          icon={FileSearch}
          title="No Search Executed"
          description="Select an office and date, then click Search to generate the Tracking Report."
        />
      ) : loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-(--border) bg-white/70 p-8 dark:bg-white/5">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm font-semibold text-soft">Generating tracking report...</p>
          </div>
        </div>
      ) : !hasResults ? (
        <EmptyState
          icon={FileSearch}
          title="No tracking records found"
          description="No documents match the selected office, date range, and filters."
        />
      ) : (
        /* Report Table matching the exact layout of the uploaded screenshot */
        <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              {/* Blue Header Bar */}
              <thead>
                <tr className="bg-[#1e88e5] text-white text-[12px] font-bold border-b border-[#1565c0]">
                  <th className="border-r border-[#1565c0] px-3 py-3 text-center whitespace-nowrap">Sl No</th>
                  <th className="border-r border-[#1565c0] px-3 py-3 text-center whitespace-nowrap">Sl No</th>
                  <th className="border-r border-[#1565c0] px-3 py-3 text-left whitespace-nowrap">Track No</th>
                  <th className="border-r border-[#1565c0] px-3 py-3 text-left whitespace-nowrap">Reg.Date</th>
                  <th className="border-r border-[#1565c0] px-3 py-3 text-left whitespace-nowrap">Reg. Office</th>
                  <th className="border-r border-[#1565c0] px-3 py-3 text-left whitespace-nowrap">Registered By</th>
                  <th className="border-r border-[#1565c0] px-3 py-3 text-left whitespace-nowrap">Collected By</th>
                  <th className="border-r border-[#1565c0] px-3 py-3 text-left whitespace-nowrap">Customer Name</th>
                  <th className="border-r border-[#1565c0] px-3 py-3 text-left whitespace-nowrap">Document Type</th>
                  <th className="border-r border-[#1565c0] px-3 py-3 text-left whitespace-nowrap">Process Type</th>
                  <th className="border-r border-[#1565c0] px-3 py-3 text-left whitespace-nowrap">Mobile</th>
                  <th className="border-r border-[#1565c0] px-3 py-3 text-center whitespace-nowrap">Status</th>
                  <th className="border-r border-[#1565c0] px-3 py-3 text-right whitespace-nowrap">Charge</th>
                  <th className="border-r border-[#1565c0] px-3 py-3 text-right whitespace-nowrap">Paid</th>
                  <th className="px-3 py-3 text-right whitespace-nowrap">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-[12px]">
                {reportData?.sections.map((section) => (
                  <React.Fragment key={`section-${section.country}`}>
                    {/* Country Header Banner */}
                    <tr className="bg-slate-100/90 dark:bg-slate-800/80 border-t-2 border-b border-slate-300 dark:border-slate-700">
                      <td
                        colSpan={15}
                        className="py-2.5 px-4 text-center font-extrabold text-sm tracking-wide text-slate-800 dark:text-slate-100"
                      >
                        {section.country}
                      </td>
                    </tr>

                    {/* Offices within this Country */}
                    {section.offices.map((officeGroup) => (
                      <React.Fragment key={`office-${section.country}-${officeGroup.officeName}`}>
                        {/* Office Subheader */}
                        <tr className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
                          <td
                            colSpan={15}
                            className="py-2 px-4 font-bold text-xs text-slate-900 dark:text-slate-200"
                          >
                            {officeGroup.officeName}
                          </td>
                        </tr>

                        {/* Rows under this Office */}
                        {officeGroup.items.map((item) => (
                          <tr
                            key={item.id}
                            className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <td className="border-r border-slate-200 dark:border-slate-800 px-3 py-2 text-center text-slate-600 dark:text-slate-400">
                              {item.overallSlNo}
                            </td>
                            <td className="border-r border-slate-200 dark:border-slate-800 px-3 py-2 text-center text-slate-600 dark:text-slate-400">
                              {item.officeSlNo}
                            </td>
                            <td className="border-r border-slate-200 dark:border-slate-800 px-3 py-2 font-semibold">
                              <Link
                                href={`/dashboard/document-details/${encodeURIComponent(item.trackingNumber)}`}
                                className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400"
                              >
                                {item.trackingNumber}
                              </Link>
                            </td>
                            <td className="border-r border-slate-200 dark:border-slate-800 px-3 py-2 whitespace-nowrap text-slate-700 dark:text-slate-300">
                              {item.regDate}
                            </td>
                            <td className="border-r border-slate-200 dark:border-slate-800 px-3 py-2 whitespace-nowrap text-slate-700 dark:text-slate-300">
                              {item.regOffice}
                            </td>
                            <td className="border-r border-slate-200 dark:border-slate-800 px-3 py-2 whitespace-nowrap text-slate-700 dark:text-slate-300">
                              {item.registeredBy}
                            </td>
                            <td className="border-r border-slate-200 dark:border-slate-800 px-3 py-2 whitespace-nowrap text-slate-700 dark:text-slate-300">
                              {item.collectedBy}
                            </td>
                            <td className="border-r border-slate-200 dark:border-slate-800 px-3 py-2 font-medium text-slate-900 dark:text-slate-100">
                              {item.customerName}
                            </td>
                            <td className="border-r border-slate-200 dark:border-slate-800 px-3 py-2 text-slate-700 dark:text-slate-300">
                              {item.documentType}
                            </td>
                            <td className="border-r border-slate-200 dark:border-slate-800 px-3 py-2 text-slate-700 dark:text-slate-300">
                              {item.processType}
                            </td>
                            <td className="border-r border-slate-200 dark:border-slate-800 px-3 py-2 whitespace-nowrap text-slate-700 dark:text-slate-300">
                              {item.mobile}
                            </td>
                            <td className="border-r border-slate-200 dark:border-slate-800 px-3 py-2 text-center">
                              <span className="inline-block rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                                {item.status}
                              </span>
                            </td>
                            <td className="border-r border-slate-200 dark:border-slate-800 px-3 py-2 text-right font-medium text-slate-900 dark:text-slate-100">
                              {formatCurrency(item.charge)}
                            </td>
                            <td className="border-r border-slate-200 dark:border-slate-800 px-3 py-2 text-right font-medium text-slate-900 dark:text-slate-100">
                              {formatCurrency(item.paid)}
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-slate-900 dark:text-slate-100">
                              {formatCurrency(item.balance)}
                            </td>
                          </tr>
                        ))}

                        {/* Office Subtotal Row */}
                        <tr className="bg-slate-50/90 dark:bg-slate-800/60 font-bold border-b border-slate-300 dark:border-slate-700">
                          <td colSpan={12} className="border-r border-slate-200 dark:border-slate-800 px-3 py-2 text-right text-slate-500 dark:text-slate-400">
                            {/* Empty as in reference screenshot */}
                          </td>
                          <td className="border-r border-slate-200 dark:border-slate-800 px-3 py-2 text-right font-extrabold text-slate-900 dark:text-white">
                            {formatCurrency(officeGroup.subtotal.charge)}
                          </td>
                          <td className="border-r border-slate-200 dark:border-slate-800 px-3 py-2 text-right font-extrabold text-slate-900 dark:text-white">
                            {formatCurrency(officeGroup.subtotal.paid)}
                          </td>
                          <td className="px-3 py-2 text-right font-extrabold text-slate-900 dark:text-white">
                            {formatCurrency(officeGroup.subtotal.balance)}
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))}

                {/* Grand Total Row */}
                <tr className="bg-slate-200/80 dark:bg-slate-800 text-xs font-black border-t-2 border-slate-400 dark:border-slate-600">
                  <td colSpan={12} className="border-r border-slate-300 dark:border-slate-700 px-4 py-3 text-right tracking-wider uppercase text-slate-800 dark:text-slate-100">
                    Grand Total ({reportData?.summary.totalDocuments} documents)
                  </td>
                  <td className="border-r border-slate-300 dark:border-slate-700 px-3 py-3 text-right font-black text-slate-900 dark:text-white text-sm">
                    {formatCurrency(reportData?.summary.totalCharges || 0)}
                  </td>
                  <td className="border-r border-slate-300 dark:border-slate-700 px-3 py-3 text-right font-black text-slate-900 dark:text-white text-sm">
                    {formatCurrency(reportData?.summary.totalPaid || 0)}
                  </td>
                  <td className="px-3 py-3 text-right font-black text-slate-900 dark:text-white text-sm">
                    {formatCurrency(reportData?.summary.totalBalance || 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
