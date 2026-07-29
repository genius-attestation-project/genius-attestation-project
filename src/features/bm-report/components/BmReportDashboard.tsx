"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Activity,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Download,
  FileSearch,
  Filter,
  Inbox,
  Layers3,
  PackageCheck,
  Printer,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  XCircle,
  Eye,
  AlertTriangle,
  Building2,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { DocumentMovementDetailsModal } from "./DocumentMovementDetailsModal";

type BmReportDashboardProps = {
  currentOfficeLocationName: string;
};

export function BmReportDashboard({ currentOfficeLocationName }: BmReportDashboardProps) {
  const [stats, setStats] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(10);

  const [selectedTrackingNumber, setSelectedTrackingNumber] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [processTypeFilter, setProcessTypeFilter] = useState("");
  const [subPackageFilter, setSubPackageFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [offices, setOffices] = useState<any[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState("");

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/bm-report/stats");
      if (res.ok) {
        const body = await res.json();
        setStats(body.stats ?? body.data);
      }
    } catch (err) {
      console.error("Failed to load BM tracking stats", err);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "15");

      if (searchQuery) params.set("query", searchQuery);
      if (processTypeFilter) params.set("processType", processTypeFilter);
      if (subPackageFilter) params.set("subPackage", subPackageFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (selectedOfficeId) params.set("officeId", selectedOfficeId);

      const res = await fetch(`/api/bm-report/tracking?${params.toString()}`);
      if (res.ok) {
        const body = await res.json();
        setItems(body.data || []);
        setTotalCount(body.total || 0);
        setTotalPages(body.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to fetch BM tracking items", err);
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery, processTypeFilter, subPackageFilter, statusFilter, startDate, endDate, selectedOfficeId]);

  useEffect(() => {
    async function loadOffices() {
      try {
        const res = await fetch("/api/offices/all");
        if (res.ok) {
          const body = await res.json();
          setOffices(body.offices || body.data || []);
        }
      } catch (err) {
        console.error("Failed to load offices", err);
      }
    }
    loadOffices();
  }, []);

  useEffect(() => {
    fetchStats();
    fetchData();
  }, [fetchStats, fetchData]);

  useEffect(() => {
    if (autoRefreshInterval <= 0) return;

    const timer = setInterval(() => {
      fetchStats();
      fetchData();
    }, autoRefreshInterval * 1000);

    return () => clearInterval(timer);
  }, [autoRefreshInterval, fetchStats, fetchData]);

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    params.set("format", "csv");
    if (searchQuery) params.set("query", searchQuery);
    if (processTypeFilter) params.set("processType", processTypeFilter);
    if (subPackageFilter) params.set("subPackage", subPackageFilter);
    if (statusFilter) params.set("status", statusFilter);

    window.open(`/api/bm-report/export?${params.toString()}`, "_blank");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Top Bar: Title & Live Auto-Refresh controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl bg-linear-to-r from-slate-900 via-slate-800 to-blue-950 p-6 text-white shadow-xl dark:from-[#0f1115] dark:to-blue-950/60 border border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-400/30">
              <Activity className="h-5 w-5 animate-pulse" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                BM Report (Real-Time Movement Tracking Center)
              </h1>
              <p className="text-xs text-slate-300">
                Live monitoring, tracking, reporting and auditing document movements system-wide
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 print:hidden">
          {offices.length > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1.5 backdrop-blur-md border border-white/10 text-xs">
              <Building2 className="h-3.5 w-3.5 text-blue-400" />
              <select
                value={selectedOfficeId}
                onChange={(e) => setSelectedOfficeId(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none"
              >
                <option value="" className="bg-slate-900 text-white">All Offices</option>
                {offices.map((o) => (
                  <option key={o.id} value={o.id} className="bg-slate-900 text-white">
                    {o.officeName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1.5 backdrop-blur-md border border-white/10 text-xs">
            <Clock className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-slate-300 font-medium">Live Polling:</span>
            <select
              value={autoRefreshInterval}
              onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
              className="bg-transparent text-white font-semibold focus:outline-none"
            >
              <option value={5} className="bg-slate-900 text-white">Every 5s</option>
              <option value={10} className="bg-slate-900 text-white">Every 10s</option>
              <option value={30} className="bg-slate-900 text-white">Every 30s</option>
              <option value={0} className="bg-slate-900 text-white">Off</option>
            </select>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              fetchStats();
              fetchData();
            }}
            disabled={isLoading}
            className="rounded-xl bg-white/10 text-white hover:bg-white/20 border border-white/10"
          >
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            className="rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-md"
          >
            <FileSpreadsheet className="mr-2 h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Real-time KPI Statistics Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 print:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-[#0f1115]">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Total Movements</span>
            <ArrowRightLeft className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {stats?.totalMovements ?? "-"}
          </p>
          <span className="text-[10px] text-slate-400">Recorded across system</span>
        </div>

        <div className="rounded-2xl border border-blue-200/80 bg-blue-50/50 p-4 shadow-xs dark:border-blue-500/20 dark:bg-blue-500/10">
          <div className="flex items-center justify-between text-blue-700 dark:text-blue-300">
            <span className="text-xs font-semibold">In Transit</span>
            <Send className="h-4 w-4 text-blue-600 animate-pulse" />
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-900 dark:text-blue-100">
            {stats?.inTransitCount ?? "-"}
          </p>
          <span className="text-[10px] text-blue-600/70 dark:text-blue-300/70">Moving between offices</span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-[#0f1115]">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Transferred Today</span>
            <Inbox className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {stats?.transferredToday ?? "-"}
          </p>
          <span className="text-[10px] text-slate-400">Dispatched today</span>
        </div>

        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-4 shadow-xs dark:border-emerald-500/20 dark:bg-emerald-500/10">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300">
            <span className="text-xs font-semibold">Received Today</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-900 dark:text-emerald-100">
            {stats?.receivedToday ?? "-"}
          </p>
          <span className="text-[10px] text-emerald-600/70 dark:text-emerald-300/70">Accepted today</span>
        </div>

        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 shadow-xs dark:border-amber-500/20 dark:bg-amber-500/10">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-300">
            <span className="text-xs font-semibold">Delayed Docs</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-900 dark:text-amber-100">
            {stats?.delayedDocumentsCount ?? "-"}
          </p>
          <span className="text-[10px] text-amber-700/70 dark:text-amber-300/70">Held &gt; 3 days</span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-[#0f1115]">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Avg Proc Time</span>
            <Clock className="h-4 w-4 text-purple-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {stats?.avgProcessingTimeDays ?? 1.5} <span className="text-xs font-normal">days</span>
          </p>
          <span className="text-[10px] text-slate-400">Completion speed</span>
        </div>
      </div>

      {/* Multi-Parameter Filter Toolbar */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-[#0f1115] space-y-4 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <Filter className="h-4 w-4 text-blue-600" />
            Live Search & Movement Filters
          </div>
          {(searchQuery || processTypeFilter || subPackageFilter || statusFilter || startDate || endDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setProcessTypeFilter("");
                setSubPackageFilter("");
                setStatusFilter("");
                setStartDate("");
                setEndDate("");
              }}
              className="text-xs text-red-600 hover:bg-red-50"
            >
              Clear Filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search tracking #, customer..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs font-medium text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>

          <select
            value={processTypeFilter}
            onChange={(e) => {
              setProcessTypeFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            <option value="">All Process Types</option>
            <option value="Standard">Standard</option>
            <option value="Express">Express</option>
            <option value="Embassy Attestation">Embassy Attestation</option>
            <option value="Apostille">Apostille</option>
          </select>

          <select
            value={subPackageFilter}
            onChange={(e) => {
              setSubPackageFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            <option value="">All Sub Packages</option>
            <option value="HRD Attestation">HRD Attestation</option>
            <option value="MEA Attestation">MEA Attestation</option>
            <option value="Embassy Legalization">Embassy Legalization</option>
            <option value="MOFA Attestation">MOFA Attestation</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="Registered">Registered</option>
            <option value="In Transit">In Transit</option>
            <option value="INBOUND">Inbound</option>
            <option value="Document In Hand">Document In Hand</option>
            <option value="Completed">Completed</option>
            <option value="Ready For Delivery">Ready For Delivery</option>
            <option value="Returned">Returned</option>
            <option value="Rejected">Rejected</option>
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>
      </div>

      {/* Real-time Document Movements Table */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-xs dark:border-white/10 dark:bg-[#0f1115] overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-4 dark:border-white/10">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              System Document Movements
            </h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
              {totalCount} Total
            </span>
          </div>

          <Button variant="ghost" size="sm" onClick={handlePrint} className="print:hidden">
            <Printer className="mr-2 h-4 w-4 text-slate-500" />
            Print
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={FileSearch}
              title="No Document Movements Found"
              description="Adjust your search query or filters to locate tracking records."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-white/5 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="p-4">Tracking Number</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Process Type</th>
                  <th className="p-4">Current Office</th>
                  <th className="p-4">Current Module</th>
                  <th className="p-4">Sub Package</th>
                  <th className="p-4">Current Status</th>
                  <th className="p-4">Last Movement</th>
                  <th className="p-4">Current Holder</th>
                  <th className="p-4">Last Updated</th>
                  <th className="p-4 text-right print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 bg-white dark:divide-white/5 dark:bg-[#0f1115]">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => setSelectedTrackingNumber(item.trackingNumber)}
                  >
                    <td className="p-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {item.trackingNumber}
                      {item.bundleNumber && (
                        <span className="block text-[10px] font-normal text-slate-400">
                          Bundle: {item.bundleNumber}
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-semibold text-slate-900 dark:text-white">
                      {item.customerName}
                    </td>
                    <td className="p-4">{item.processType}</td>
                    <td className="p-4 font-medium text-slate-800 dark:text-slate-200">
                      {item.currentOffice}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-white/10 dark:text-slate-300">
                        {item.currentModule}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-mono">{item.currentSubPackage}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          item.currentStatus === "Completed" || item.currentStatus === "Ready For Delivery"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                            : item.currentStatus === "In Transit" || item.currentStatus === "INBOUND"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 animate-pulse"
                            : item.currentStatus === "Rejected"
                            ? "bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                        }`}
                      >
                        {item.currentStatus}
                      </span>
                    </td>
                    <td className="p-4 text-xs max-w-xs truncate" title={item.lastMovement}>
                      {item.lastMovement}
                    </td>
                    <td className="p-4 text-xs font-semibold">{item.currentHolder}</td>
                    <td className="p-4 text-xs text-slate-500">
                      {new Date(item.lastUpdated).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="p-4 text-right print:hidden">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTrackingNumber(item.trackingNumber);
                        }}
                        className="rounded-xl text-xs"
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200/80 px-6 py-3 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 print:hidden">
            <span className="text-xs text-slate-500">
              Page {page} of {totalPages} ({totalCount} total tracking records)
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {selectedTrackingNumber && (
        <DocumentMovementDetailsModal
          trackingNumber={selectedTrackingNumber}
          onClose={() => setSelectedTrackingNumber(null)}
        />
      )}
    </div>
  );
}
