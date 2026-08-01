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
import { PriorityBadge } from "@/components/ui/PriorityBadge";

type BmReportDashboardProps = {
  currentOfficeLocationName: string;
};

function formatModule(moduleName?: string | null) {
  if (!moduleName) return "-";
  if (moduleName === "DOCUMENT_IN_HAND") return "Document In Hand";
  if (moduleName === "ASSIGNED_OFFICE") return "Assigned Office";
  if (moduleName === "PROCESS") return "Process Module";
  if (moduleName === "REGISTRATION") return "Revenue Registration";
  return moduleName.replace(/_/g, " ");
}

function formatSubPackage(subPackage?: string | null) {
  if (!subPackage || subPackage === "-") return "-";
  if (subPackage.startsWith("c") && subPackage.length > 20) return "-";
  return subPackage;
}

function formatStatus(status?: string | null) {
  if (!status) return "Pending";
  if (status === "IN_HAND") return "In Hand";
  if (status === "INBOUND_PENDING") return "Pending Receive";
  return status.replace(/_/g, " ");
}

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
  const [priorityFilter, setPriorityFilter] = useState("");
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

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6 print:space-y-4">
      {/* Sleek Top Banner Matching Application Theme */}
      <section className="relative overflow-hidden rounded-4xl border border-blue-100 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_42%),linear-gradient(135deg,#ffffff,#eff6ff)] p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-blue-600">
                <Activity className="h-3.5 w-3.5 animate-pulse text-blue-600" />
                BM Report
              </span>
              <span className="inline-flex items-center rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700">
                Live Tracking Center
              </span>
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Real-Time Document Movement Tracking Center
            </h1>
            <p className="mt-1.5 max-w-2xl text-xs sm:text-sm leading-6 text-slate-600">
              System-wide real-time tracking, live monitoring, reporting, and complete movement audit center.
            </p>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-blue-200/80 bg-white/95 p-3 shadow-sm backdrop-blur-xs shrink-0 print:hidden">
            {offices.length > 0 && (
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                <Building2 className="h-3.5 w-3.5 text-blue-600" />
                <select
                  value={selectedOfficeId}
                  onChange={(e) => {
                    setSelectedOfficeId(e.target.value);
                    setPage(1);
                  }}
                  className="bg-transparent text-slate-800 font-semibold focus:outline-none"
                >
                  <option value="">All Offices</option>
                  {offices.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.officeName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
              <Clock className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-slate-500">Live Polling:</span>
              <select
                value={autoRefreshInterval}
                onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                className="bg-transparent text-slate-800 font-bold focus:outline-none"
              >
                <option value={5}>Every 5s</option>
                <option value={10}>Every 10s</option>
                <option value={30}>Every 30s</option>
                <option value={0}>Off</option>
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
              className="h-9 gap-1.5 rounded-xl border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-blue-600 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            <Button
              size="sm"
              onClick={handleExportCsv}
              className="h-9 gap-1.5 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-md hover:bg-blue-700"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>
        </div>
      </section>

      {/* KPI Stats Cards - Compact & Responsive */}
      <section className="grid gap-4 grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 print:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold text-slate-600">Total Movements</span>
            <ArrowRightLeft className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {stats?.totalMovements ?? "-"}
          </p>
          <span className="text-[11px] font-medium text-slate-400">System movement records</span>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 shadow-xs">
          <div className="flex items-center justify-between text-blue-700">
            <span className="text-xs font-bold text-blue-800">In Transit</span>
            <Send className="h-4 w-4 text-blue-600 animate-pulse" />
          </div>
          <p className="mt-2 text-2xl font-black text-blue-900">
            {stats?.inTransitCount ?? "-"}
          </p>
          <span className="text-[11px] font-semibold text-blue-600/80">Moving between offices</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold text-slate-600">Transferred Today</span>
            <Inbox className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {stats?.transferredToday ?? "-"}
          </p>
          <span className="text-[11px] font-medium text-slate-400">Dispatched today</span>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-bold text-emerald-800">Received Today</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-900">
            {stats?.receivedToday ?? "-"}
          </p>
          <span className="text-[11px] font-semibold text-emerald-700/80">Accepted today</span>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-xs font-bold text-amber-900">Delayed Docs</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-900">
            {stats?.delayedDocumentsCount ?? "-"}
          </p>
          <span className="text-[11px] font-semibold text-amber-700/80">Held &gt; 3 days</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold text-slate-600">Avg Proc Time</span>
            <Clock className="h-4 w-4 text-purple-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {stats?.avgProcessingTimeDays ?? 1.5} <span className="text-xs font-medium text-slate-500">days</span>
          </p>
          <span className="text-[11px] font-medium text-slate-400">Completion speed</span>
        </div>
      </section>

      {/* Clean Filter Bar */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <Filter className="h-4 w-4 text-blue-600" />
            Live Movement Filters
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
              className="h-7 text-xs font-bold text-rose-600 hover:bg-rose-50"
            >
              Clear Filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
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
              className="w-full rounded-xl border border-slate-300 bg-slate-50/70 py-2 pl-9 pr-3 text-xs font-medium text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
            />
          </div>

          <select
            value={processTypeFilter}
            onChange={(e) => {
              setProcessTypeFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-300 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
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
            className="rounded-xl border border-slate-300 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
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
            className="rounded-xl border border-slate-300 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
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

          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-300 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
          >
            <option value="">All Priorities</option>
            <option value="Normal">Normal</option>
            <option value="Express">Express</option>
            <option value="Super Fast">Super Fast</option>
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-300 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
          />
        </div>
      </section>

      {/* Main Document Movements Table */}
      <section className="min-w-0 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              System Document Movements
            </h3>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
              {totalCount} Total
            </span>
          </div>
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
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-4">Tracking Number</th>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4">Process Type</th>
                  <th className="px-5 py-4">Current Office</th>
                  <th className="px-5 py-4">Current Module</th>
                  <th className="px-5 py-4">Sub Package</th>
                  <th className="px-5 py-4">Current Status</th>
                  <th className="px-5 py-4">Last Movement</th>
                  <th className="px-5 py-4">Current Holder</th>
                  <th className="px-5 py-4">Last Updated</th>
                  <th className="px-5 py-4 text-right print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {items
                  .filter((item) => !priorityFilter || (item.priority || "Normal") === priorityFilter)
                  .map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                    onClick={() => setSelectedTrackingNumber(item.trackingNumber)}
                  >
                    <td className="px-5 py-4 font-bold text-blue-600">
                      <div className="flex items-center gap-1.5">
                        <span>{item.trackingNumber}</span>
                        <PriorityBadge priority={item.priority} size="xs" />
                      </div>
                      {item.bundleNumber && (
                        <span className="block text-[10px] font-mono font-medium text-slate-400 mt-0.5">
                          Bundle: {item.bundleNumber}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 font-semibold text-slate-900 max-w-37.5 truncate" title={item.customerName}>
                      {item.customerName}
                    </td>

                    <td className="px-5 py-4 text-slate-600 font-medium max-w-35 truncate" title={item.processType}>
                      {item.processType}
                    </td>

                    <td className="px-5 py-4 font-bold text-slate-800 max-w-32.5 truncate" title={item.currentOffice}>
                      {item.currentOffice}
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 border border-slate-200">
                        {formatModule(item.currentModule)}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-600 font-mono font-medium max-w-30 truncate">
                      {formatSubPackage(item.currentSubPackage)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                          item.currentStatus === "Completed" || item.currentStatus === "Ready For Delivery" || item.currentStatus === "Delivered"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : item.currentStatus === "In Transit" || item.currentStatus === "INBOUND" || item.currentStatus === "Pending Receive"
                            ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                            : item.currentStatus === "Rejected"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {formatStatus(item.currentStatus)}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-600 max-w-45 truncate" title={item.lastMovement}>
                      {item.lastMovement}
                    </td>

                    <td className="px-5 py-4 font-medium text-slate-800">
                      {item.currentHolder}
                    </td>

                    <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                      {new Date(item.lastUpdated).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    <td className="px-5 py-4 text-right print:hidden">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTrackingNumber(item.trackingNumber);
                        }}
                        className="h-8 rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50 font-bold gap-1 text-[11px]"
                      >
                        <Eye className="h-3.5 w-3.5 text-blue-600" />
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3 bg-slate-50/50 print:hidden text-xs">
            <span className="text-slate-500 font-medium">
              Page {page} of {totalPages} ({totalCount} total tracking records)
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 rounded-xl font-bold text-xs"
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 rounded-xl font-bold text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Slide-over Movement Details Modal */}
      {selectedTrackingNumber && (
        <DocumentMovementDetailsModal
          trackingNumber={selectedTrackingNumber}
          onClose={() => setSelectedTrackingNumber(null)}
        />
      )}
    </div>
  );
}
