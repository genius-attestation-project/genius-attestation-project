"use client";

import { useState } from "react";
import {
  MapPin,
  ArrowRight,
  CheckCircle2,
  Clock,
  User,
  History,
  Package,
  Layers,
  ChevronLeft,
  ChevronRight,
  Building2,
  FileText,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatBundleNumber } from "@/utils/format";

type MovementNode = {
  stepNumber: number;
  officeName: string;
  moduleName: string;
  section: string;
  status: string;
  timestamp: Date | string;
  performedBy: string;
  currentHolder?: string;
  remarks?: string;
  isCurrent: boolean;
};

type HistoryRow = {
  stepNumber: number;
  fromOffice: string;
  toOffice: string;
  module: string;
  section: string;
  movementType: string;
  status: string;
  transferredOn: Date | string;
  transferredBy: string;
  documentsCount: number;
  remarks: string;
};

type BundleDetails = {
  bundleNumber: string;
  totalDocuments: number;
  packageType: string;
  createdOn: Date | string;
  createdBy: string;
  priority: string;
  currentStatus: string;
};

type OfficeMovementMapProps = {
  nodes: MovementNode[];
  historyTableRows?: HistoryRow[];
  bundleDetails?: BundleDetails;
  deliveryLocation?: string | null;
  onViewBundleHistory?: () => void;
};

export function OfficeMovementMap({
  nodes,
  historyTableRows,
  bundleDetails,
  deliveryLocation,
  onViewBundleHistory,
}: OfficeMovementMapProps) {
  const [tablePage, setTablePage] = useState(1);
  const pageSize = 5;

  if (!nodes || nodes.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
        No movement tracking nodes recorded yet.
      </div>
    );
  }

  const rows = historyTableRows || nodes.map((n) => ({
    stepNumber: n.stepNumber,
    fromOffice: n.stepNumber > 1 ? nodes[n.stepNumber - 2].officeName : "Origin",
    toOffice: n.officeName,
    module: n.moduleName,
    section: n.section,
    movementType: n.section,
    status: n.status,
    transferredOn: n.timestamp,
    transferredBy: n.performedBy,
    documentsCount: 1,
    remarks: n.remarks || "-",
  }));

  const totalPages = Math.ceil(rows.length / pageSize);
  const paginatedRows = rows.slice((tablePage - 1) * pageSize, tablePage * pageSize);

  const getSectionBadgeClass = (section: string) => {
    const s = section.toLowerCase();
    if (s.includes("sub package") || s.includes("subpackage")) {
      return "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300";
    }
    if (s.includes("inbound")) {
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
    }
    if (s.includes("document in hand") || s.includes("in hand")) {
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";
    }
    if (s.includes("completed")) {
      return "bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300";
    }
    if (s.includes("returned")) {
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300";
    }
    if (s.includes("rejected")) {
      return "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300";
    }
    return "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300";
  };

  const getStatusBadgeClass = (status: string) => {
    const st = status.toLowerCase();
    if (st.includes("received") || st.includes("completed") || st.includes("delivered")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300";
    }
    if (st.includes("in transit") || st.includes("in progress")) {
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300";
    }
    if (st.includes("returned")) {
      return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300";
    }
    if (st.includes("rejected")) {
      return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300";
    }
    return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300";
  };

  return (
    <div className="space-y-6">
      {/* 1. Visual Office Movement Path Title */}
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-blue-900 dark:text-blue-300">
        <MapPin className="h-4 w-4 text-blue-600" />
        Visual Office Movement Map
      </div>

      {/* 2. Interactive Horizontal Node Sequence Diagram */}
      <div className="overflow-x-auto pb-4 pt-2">
        <div className="flex items-center gap-4 min-w-max">
          {nodes.map((node, idx) => {
            const isLast = idx === nodes.length - 1;
            const nodeDate = new Date(node.timestamp);
            const dateStr = isNaN(nodeDate.getTime())
              ? "-"
              : nodeDate.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
            const timeStr = isNaN(nodeDate.getTime())
              ? ""
              : nodeDate.toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                });

            return (
              <div key={idx} className="flex items-center gap-4">
                {/* Individual Card Node */}
                <div
                  className={`relative flex flex-col w-56 rounded-3xl border p-4 shadow-sm transition-all duration-200 ${
                    node.isCurrent
                      ? "border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/30 shadow-md"
                      : "border-slate-200 bg-white dark:border-white/10 dark:bg-[#12151c]"
                  }`}
                >
                  {/* Step Circle & Title */}
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black shadow-xs ${
                        node.isCurrent
                          ? "bg-blue-600 text-white"
                          : idx === 0
                          ? "bg-emerald-600 text-white"
                          : "bg-blue-500 text-white"
                      }`}
                    >
                      {node.stepNumber || idx + 1}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate" title={node.officeName}>
                      {node.officeName}
                    </h4>
                  </div>

                  {/* Module Section Badge */}
                  <div className="mt-3 flex justify-center">
                    <span
                      className={`w-full text-center rounded-xl px-2.5 py-1 text-[11px] font-bold ${getSectionBadgeClass(
                        node.section || node.moduleName
                      )}`}
                    >
                      {node.section || node.moduleName}
                    </span>
                  </div>

                  {/* Status & Timestamp */}
                  <div className="mt-3 space-y-1 text-center">
                    <div className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${getStatusBadgeClass(
                          node.status
                        )}`}
                      >
                        {node.status}
                      </span>
                    </div>

                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {dateStr} {timeStr}
                    </p>

                    <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate" title={node.performedBy}>
                      {node.performedBy}
                    </p>
                  </div>
                </div>

                {/* Arrow Connector */}
                {!isLast && (
                  <div className="flex items-center text-blue-400">
                    <ArrowRight className="h-5 w-5 text-blue-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Bottom Grid: Movement History Table (Left) + Bunch Details Card (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Left Column: Movement History Table */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-[#0f1115] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <History className="h-4 w-4 text-blue-600" />
              Movement History
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {rows.length} total events
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-white/5 font-bold uppercase text-slate-500 tracking-wider border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">From Office</th>
                  <th className="p-3">To Office</th>
                  <th className="p-3">Movement Type</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Transferred On</th>
                  <th className="p-3">Transferred By</th>
                  <th className="p-3">Docs</th>
                  <th className="p-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10 bg-white dark:bg-[#0f1115]">
                {paginatedRows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/70 dark:hover:bg-white/5 transition-colors">
                    <td className="p-3 font-bold text-slate-400">{r.stepNumber}</td>
                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{r.fromOffice}</td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">{r.toOffice}</td>
                    <td className="p-3">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${getSectionBadgeClass(r.movementType || r.section)}`}>
                        {r.movementType || r.section}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${getStatusBadgeClass(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500">
                      {new Date(r.transferredOn).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300 font-medium">{r.transferredBy}</td>
                    <td className="p-3 font-bold text-center">{r.documentsCount || 1}</td>
                    <td className="p-3 text-slate-400 italic max-w-xs truncate">{r.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 text-xs">
              <span className="text-slate-500">
                Showing {(tablePage - 1) * pageSize + 1} to {Math.min(tablePage * pageSize, rows.length)} of {rows.length} entries
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={tablePage <= 1}
                  onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <Button
                    key={idx}
                    variant={tablePage === idx + 1 ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => setTablePage(idx + 1)}
                    className="h-8 w-8 p-0 text-xs font-bold"
                  >
                    {idx + 1}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={tablePage >= totalPages}
                  onClick={() => setTablePage((p) => p + 1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Bunch / Bundle Details Sidebar Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-[#0f1115] space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-3 dark:border-white/10">
            <Package className="h-4 w-4 text-blue-600" />
            Bunch Details
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Bunch No</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                {formatBundleNumber(bundleDetails?.bundleNumber)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Total Documents</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {bundleDetails?.totalDocuments || 1}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Package</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {bundleDetails?.packageType || "Standard Package"}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Created On</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                {bundleDetails?.createdOn
                  ? new Date(bundleDetails.createdOn).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "-"}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Created By</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {bundleDetails?.createdBy || "Admin"}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Priority</span>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 font-bold text-amber-700 border border-amber-200 text-[10px]">
                {bundleDetails?.priority || "Normal"}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Current Status</span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${getStatusBadgeClass(bundleDetails?.currentStatus || "In Progress")}`}>
                {bundleDetails?.currentStatus || "In Progress"}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onViewBundleHistory}
              className="w-full justify-between text-xs font-bold text-blue-600 hover:bg-blue-50 border-blue-200"
            >
              <span>View Bundle History</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
