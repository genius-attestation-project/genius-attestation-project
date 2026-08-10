"use client";

import { useEffect, useState } from "react";
import {
  X,
  Clock,
  Map,
  Package,
  Layers,
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Calendar,
  Layers3,
  Loader2,
} from "lucide-react";
import { OfficeMovementMap } from "./OfficeMovementMap";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { formatBundleNumber } from "@/utils/format";

type DocumentMovementDetailsModalProps = {
  trackingNumber: string;
  onClose: () => void;
};

export function DocumentMovementDetailsModal({
  trackingNumber,
  onClose,
}: DocumentMovementDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<
    "timeline" | "map" | "subpackage" | "bundle" | "audit"
  >("timeline");
  const [details, setDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDetails() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/bm-report/details/${encodeURIComponent(trackingNumber)}`);
        if (!res.ok) {
          const errBody = await res.json();
          throw new Error(errBody.error || "Failed to load document movement details");
        }
        const data = await res.json();
        setDetails(data.details);
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchDetails();
  }, [trackingNumber]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-6xl h-[85vh] rounded-3xl bg-white shadow-2xl dark:bg-[#0f1115] border border-slate-200 dark:border-white/10 overflow-hidden">
        {/* Header - Fixed Height */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white font-bold shrink-0">
              <Layers3 className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Document Movement Tracking
                </h2>
                <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-mono">
                  {trackingNumber}
                </span>
                <PriorityBadge priority={details?.registration?.priority} />
              </div>
              <p className="text-xs text-slate-500">
                Live chronological journey, visual map nodes, and sub package audit logs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
            <p className="mt-2 text-sm font-bold text-slate-800">{error}</p>
          </div>
        ) : details ? (
          <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
            {/* Customer Summary Bar - Fixed Height */}
            <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-slate-200 bg-slate-50/50 p-4 text-xs dark:border-white/10 dark:bg-white/5">
              <div>
                <span className="text-slate-400 block font-medium">Customer</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {details?.registration?.customerName || "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Process Type</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {details?.registration?.processType || details?.registration?.documentType || "Standard"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Sub Package</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {details?.registration?.subPackage || "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Main Process Status</span>
                <span
                  className={`inline-flex items-center gap-1 font-bold ${
                    details?.corePackageStatus?.isCompleted ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {details?.corePackageStatus?.statusLabel || details?.registration?.trackingStatus || "Registered"}
                </span>
              </div>
            </div>

            {/* Tabs Navigation - Fixed Height */}
            <div className="shrink-0 flex border-b border-slate-200 bg-white px-4 dark:border-white/10 dark:bg-[#0f1115] overflow-x-auto whitespace-nowrap scrollbar-none">
              <button
                onClick={() => setActiveTab("timeline")}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-all ${
                  activeTab === "timeline"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <Clock className="h-4 w-4" />
                Movement Timeline ({details?.timeline?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("map")}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-all ${
                  activeTab === "map"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <Map className="h-4 w-4" />
                Office Movement Map
              </button>
              <button
                onClick={() => setActiveTab("subpackage")}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-all ${
                  activeTab === "subpackage"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <Layers className="h-4 w-4" />
                Sub Package Tracking ({details?.subPackageHistory?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("bundle")}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-all ${
                  activeTab === "bundle"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <Package className="h-4 w-4" />
                Bundle History ({details?.bundleHistory?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("audit")}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-all ${
                  activeTab === "audit"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                Audit Trail ({details?.auditTrail?.length || 0})
              </button>
            </div>

            {/* Tab Body - Scrollable Content Only */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* TIMELINE TAB */}
              {activeTab === "timeline" && (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {(details?.timeline || []).map((item: any, idx: number) => (
                    <div key={item.id || idx} className="relative group">
                      <span className="absolute -left-7.75 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 ring-4 ring-white dark:ring-[#0f1115]" />
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-white/5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {item.step}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-400">
                            {new Date(item.timestamp).toLocaleString()}
                          </span>
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-slate-400">From / Origin:</span>{" "}
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {item.fromLocation}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">To / Target:</span>{" "}
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {item.toLocation}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">Module:</span>{" "}
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-300">
                              {item.module}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">Performed By:</span>{" "}
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {item.performedBy}
                            </span>
                          </div>
                        </div>

                        {item.remarks && (
                          <p className="mt-2 rounded-xl bg-slate-50 p-2 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-400 italic">
                            “{item.remarks}”
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* MAP TAB */}
              {activeTab === "map" && (
                <OfficeMovementMap
                  nodes={details?.movementPathNodes || []}
                  historyTableRows={details?.historyTableRows || []}
                  bundleDetails={details?.bundleDetails}
                  deliveryLocation={details?.registration?.deliveryLocation}
                  onViewBundleHistory={() => setActiveTab("bundle")}
                />
              )}

              {/* SUB PACKAGE TAB */}
              {activeTab === "subpackage" && (
                <div className="space-y-4">
                  {(!details?.subPackageHistory || details.subPackageHistory.length === 0) ? (
                    <p className="text-center text-xs text-slate-500 py-8">
                      No subpackage movement records found for this document.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-white/5 font-bold tracking-wider text-slate-500">
                          <tr>
                            <th className="p-3">Sub Package ID</th>
                            <th className="p-3">Assigned Office</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Started At</th>
                            <th className="p-3">Completed At</th>
                            <th className="p-3">Created By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                          {(details?.subPackageHistory || []).map((sp: any) => (
                            <tr key={sp.id}>
                              <td className="p-3 font-mono font-bold text-blue-600">
                                {sp.subPackageId}
                              </td>
                              <td className="p-3 font-semibold">{sp.assignedOffice}</td>
                              <td className="p-3">
                                <span className="rounded-full bg-blue-50 px-2 py-0.5 font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                  {sp.status}
                                </span>
                              </td>
                              <td className="p-3 text-slate-500">
                                {new Date(sp.startedAt).toLocaleString()}
                              </td>
                              <td className="p-3 text-slate-500">
                                {sp.completedAt
                                  ? new Date(sp.completedAt).toLocaleString()
                                  : "-"}
                              </td>
                              <td className="p-3">{sp.createdBy}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* BUNDLE HISTORY TAB */}
              {activeTab === "bundle" && (
                <div className="space-y-4">
                  {(!details?.bundleHistory || details.bundleHistory.length === 0) ? (
                    <p className="text-center text-xs text-slate-500 py-8">
                      No bundle transfer history recorded for this document.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(details?.bundleHistory || []).map((bh: any, idx: number) => (
                        <div
                          key={bh.bundleId || idx}
                          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-white/5 space-y-2"
                        >
                          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                            <span className="font-mono text-xs font-bold text-blue-600">
                              {formatBundleNumber(bh.bundleNumber)}
                            </span>
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                              {bh.status}
                            </span>
                          </div>
                          <div className="text-xs space-y-1 text-slate-600 dark:text-slate-400">
                            <div>From: <strong className="text-slate-800 dark:text-slate-200">{bh.fromOffice}</strong></div>
                            <div>To: <strong className="text-slate-800 dark:text-slate-200">{bh.toOffice}</strong></div>
                            <div>Transferred By: {bh.transferredBy} on {new Date(bh.transferredTime).toLocaleDateString()}</div>
                            {bh.receivedBy && <div>Received By: {bh.receivedBy}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* AUDIT TRAIL TAB */}
              {activeTab === "audit" && (
                <div className="space-y-3">
                  {(details?.auditTrail || []).map((audit: any) => (
                    <div
                      key={audit.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs dark:border-white/10 dark:bg-white/5"
                    >
                      <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                        <span>{audit.action}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(audit.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-600 dark:text-slate-400">
                        {audit.description}
                      </p>
                      <span className="mt-1 block text-[10px] text-slate-400">
                        By: {audit.performedBy}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
