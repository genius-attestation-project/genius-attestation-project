"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Package,
  CheckCircle2,
  RotateCcw,
  XCircle,
  ArrowLeft,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Calendar,
  MoreVertical,
  Bell,
  Building2,
  CheckSquare,
  Square,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";

type SubPackagesClientProps = {
  officeId: string;
};

export function SubPackagesClient({ officeId }: SubPackagesClientProps) {
  const [subPackages, setSubPackages] = useState<any[]>([]);
  const [coreSubPackageId, setCoreSubPackageId] = useState<string | null>(null);
  const [activeSubPackageId, setActiveSubPackageId] = useState<string>("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMovementIds, setSelectedMovementIds] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [remarksModal, setRemarksModal] = useState<{
    open: boolean;
    action: "return" | "reject" | null;
  }>({ open: false, action: null });
  const [remarks, setRemarks] = useState("");

  const tabContainerRef = useRef<HTMLDivElement>(null);

  // Load office assigned subpackages and movements
  const fetchData = useCallback(async () => {
    setLoading(true);
    setSelectedMovementIds([]);
    try {
      const res = await fetch(`/api/assigned-office/workspace?action=subpackage_items&officeId=${officeId}`);
      if (res.ok) {
        const data = await res.json();
        setSubPackages(data.subPackages || []);
        setCoreSubPackageId(data.coreSubPackageId || null);
        setItems(data.items || []);

        // Filter out core package for tabs
        const displaySubPkgs = (data.subPackages || []).filter((sp: any) => sp.id !== data.coreSubPackageId);
        if (displaySubPkgs.length > 0 && (!activeSubPackageId || !displaySubPkgs.some((sp: any) => sp.id === activeSubPackageId))) {
          setActiveSubPackageId(displaySubPkgs[0].id);
        } else if (data.subPackages?.length > 0 && !activeSubPackageId) {
          setActiveSubPackageId(data.subPackages[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch subpackage data", err);
    } finally {
      setLoading(false);
    }
  }, [officeId, activeSubPackageId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Exclude Core Package from tabs as specified by prompt rules
  const displayTabs = subPackages.filter((sp) => sp.id !== coreSubPackageId);

  // Filter items assigned to the active subpackage tab that are actively in progress
  const activeTabItems = items.filter(
    (item) => item.subPackageId === activeSubPackageId && item.status === "In Progress"
  );

  // Filter items by search query and status filter
  const filteredItems = activeTabItems.filter((item) => {
    const trackingMatch =
      !searchQuery ||
      item.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.registration?.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.registration?.documentType?.toLowerCase().includes(searchQuery.toLowerCase());

    const statusMatch =
      statusFilter === "ALL" ||
      (statusFilter === "IN_PROGRESS" && item.status === "In Progress") ||
      (statusFilter === "COMPLETED" && item.status === "Completed") ||
      (statusFilter === "RETURNED" && item.status === "Returned") ||
      (statusFilter === "REJECTED" && item.status === "Rejected");

    return trackingMatch && statusMatch;
  });

  // Toggle selection
  const toggleSelectMovement = (id: string) => {
    setSelectedMovementIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedMovementIds.length === filteredItems.length && filteredItems.length > 0) {
      setSelectedMovementIds([]);
    } else {
      setSelectedMovementIds(filteredItems.map((item) => item.id));
    }
  };

  // Scroll tab container horizontally
  const scrollTabs = (direction: "left" | "right") => {
    if (tabContainerRef.current) {
      const scrollAmount = direction === "left" ? -250 : 250;
      tabContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Execute subpackage action (Complete, Return, Reject)
  const handleAction = async (actionType: "complete" | "return" | "reject", actionRemarks?: string) => {
    if (selectedMovementIds.length === 0) return;

    setProcessing(true);
    try {
      const res = await fetch("/api/assigned-office/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "subpackage_action",
          officeId,
          movementIds: selectedMovementIds,
          subPackageAction: actionType,
          remarks: actionRemarks || remarks,
        }),
      });

      if (res.ok) {
        setRemarksModal({ open: false, action: null });
        setRemarks("");
        fetchData();
      }
    } catch (err) {
      console.error("Action failed", err);
    } finally {
      setProcessing(false);
    }
  };

  const activeTabName = subPackages.find((sp) => sp.id === activeSubPackageId)?.name || "Sub Package";

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5 dark:border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href={officeId ? `/dashboard/assigned-office/workspace?officeId=${officeId}` : "/dashboard/assigned-office/workspace"}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
              title="Back to Workspace"
            >
              <ArrowLeft size={20} />
            </Link>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Package size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Sub Packages
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage and track all sub packages efficiently
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={fetchData}
            disabled={loading}
            className="gap-2 rounded-xl border border-slate-200/80 bg-white shadow-xs hover:bg-slate-50 dark:border-white/15 dark:bg-white/5"
          >
            <RefreshCw size={15} className={cn(loading && "animate-spin")} />
            Refresh
          </Button>

          <Link href={officeId ? `/dashboard/assigned-office/workspace?officeId=${officeId}` : "/dashboard/assigned-office/workspace"}>
            <Button className="gap-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 shadow-md">
              <Building2 size={16} />
              Workspace
            </Button>
          </Link>
        </div>
      </div>

      {/* Horizontal SubPackage Tabs Slider */}
      <div className="relative rounded-2xl border border-slate-200/70 bg-slate-50/50 p-2 dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center gap-1">
          {/* Scroll Left Button */}
          <button
            type="button"
            onClick={() => scrollTabs("left")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:bg-white/10 transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft size={18} />
          </button>

          {/* Scrollable Tabs */}
          <div
            ref={tabContainerRef}
            className="flex flex-1 items-center gap-2 overflow-x-auto scrollbar-none scroll-smooth py-1"
          >
            {displayTabs.length === 0 ? (
              <div className="px-4 py-2 text-xs font-semibold text-slate-400">
                No Sub Packages Assigned
              </div>
            ) : (
              displayTabs.map((sp) => {
                const isActive = activeSubPackageId === sp.id;
                const count = items.filter(
                  (item) => item.subPackageId === sp.id && item.status === "In Progress"
                ).length;

                return (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => {
                      setActiveSubPackageId(sp.id);
                      setSelectedMovementIds([]);
                    }}
                    className={cn(
                      "group flex shrink-0 items-center gap-2.5 rounded-xl px-5 py-3 text-xs font-bold transition-all duration-200 shadow-xs",
                      isActive
                        ? "bg-[#0B2545] text-white shadow-md dark:bg-blue-600 dark:text-white"
                        : "bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-100 hover:text-slate-900 dark:bg-white/10 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/15"
                    )}
                  >
                    <Package
                      size={16}
                      className={cn(
                        "transition-transform duration-200 group-hover:scale-110",
                        isActive ? "text-white" : "text-slate-400 dark:text-slate-300"
                      )}
                    />
                    <span className="truncate max-w-40">{sp.name}</span>
                    <span
                      className={cn(
                        "ml-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold",
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-slate-200/80 text-slate-700 dark:bg-white/20 dark:text-slate-100"
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Scroll Right Button */}
          <button
            type="button"
            onClick={() => scrollTabs("right")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:bg-white/10 transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tracking number or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-200/80 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 placeholder:text-slate-400 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-[#0f1115] dark:text-white"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none rounded-2xl border border-slate-200/80 bg-white py-2.5 pl-4 pr-9 text-xs font-semibold text-slate-700 shadow-xs focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-[#0f1115] dark:text-slate-200"
            >
              <option value="ALL">All Statuses</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="RETURNED">Returned</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <Filter size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="flex items-center rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-600 shadow-xs dark:border-white/10 dark:bg-[#0f1115] dark:text-slate-300">
            <Calendar size={14} className="mr-2 text-slate-400" />
            <span>Select Date Range</span>
          </div>
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-[#0f1115]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          >
            {filteredItems.length > 0 && selectedMovementIds.length === filteredItems.length ? (
              <CheckSquare size={18} className="text-blue-600 dark:text-blue-400" />
            ) : (
              <Square size={18} className="text-slate-400" />
            )}
            <span>Select All</span>
          </button>

          <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
            {selectedMovementIds.length} Selected
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Complete Button */}
          <Button
            disabled={selectedMovementIds.length === 0 || processing}
            onClick={() => handleAction("complete")}
            className="gap-2 rounded-xl bg-[#00B050] text-white hover:bg-emerald-700 shadow-md font-bold px-4"
          >
            <CheckCircle2 size={16} />
            Complete
          </Button>

          {/* Return Button */}
          <Button
            disabled={selectedMovementIds.length === 0 || processing}
            onClick={() => setRemarksModal({ open: true, action: "return" })}
            className="gap-2 rounded-xl bg-[#FF9900] text-white hover:bg-amber-600 shadow-md font-bold px-4"
          >
            <RotateCcw size={16} />
            Return
          </Button>

          {/* Reject Button */}
          <Button
            disabled={selectedMovementIds.length === 0 || processing}
            onClick={() => setRemarksModal({ open: true, action: "reject" })}
            className="gap-2 rounded-xl bg-[#FF3333] text-white hover:bg-rose-700 shadow-md font-bold px-4"
          >
            <XCircle size={16} />
            Reject
          </Button>
        </div>
      </div>

      {/* Documents Data Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden dark:border-white/10 dark:bg-[#0f1115]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="border-b border-slate-200/80 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-white/10 dark:bg-white/5">
              <tr>
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={filteredItems.length > 0 && selectedMovementIds.length === filteredItems.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="p-4 w-16">SL No.</th>
                <th className="p-4">Tracking Number</th>
                <th className="p-4">Customer Name</th>
                <th className="p-4">Document Type</th>
                <th className="p-4">Process Type</th>
                <th className="p-4">Assigned Date</th>
                <th className="p-4">Current Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    <RefreshCw className="mx-auto h-7 w-7 animate-spin text-blue-600" />
                    <p className="mt-3 text-sm font-semibold">Loading sub package documents...</p>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-500">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/10">
                      <Package size={24} className="text-slate-400" />
                    </div>
                    <p className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
                      No documents assigned to this Sub Package.
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Documents transferred from Document In Hand to {activeTabName} will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => {
                  const isSelected = selectedMovementIds.includes(item.id);
                  const reg = item.registration;
                  const status = item.status;

                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        "hover:bg-slate-50/70 dark:hover:bg-white/5 transition-colors",
                        isSelected && "bg-blue-50/50 dark:bg-blue-500/10"
                      )}
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectMovement(item.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-4 text-xs font-semibold text-slate-400">
                        {index + 1}
                      </td>
                      <td className="p-4 font-bold text-blue-600 dark:text-blue-400">
                        {item.trackingNumber}
                      </td>
                      <td className="p-4 font-semibold text-slate-900 dark:text-white">
                        {reg?.customerName || "-"}
                      </td>
                      <td className="p-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                        {reg?.documentType || "-"}
                      </td>
                      <td className="p-4 text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {reg?.processType || "-"}
                      </td>
                      <td className="p-4 text-xs text-slate-500">
                        {new Date(item.startedAt).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-extrabold",
                            status === "Completed"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
                              : status === "Returned"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
                              : status === "Rejected"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300"
                          )}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10"
                          title="Actions"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Remarks Modal for Return / Reject */}
      {remarksModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl dark:bg-[#0f1115] border border-slate-200 dark:border-white/10 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
              {remarksModal.action} Sub Package Document(s)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Provide remarks for this action ({selectedMovementIds.length} item(s) selected).
            </p>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter remarks/reason..."
              rows={3}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={() => setRemarksModal({ open: false, action: null })}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleAction(remarksModal.action!, remarks)}
                disabled={processing}
                className={cn(
                  "rounded-xl font-bold text-white",
                  remarksModal.action === "return" ? "bg-amber-600 hover:bg-amber-700" : "bg-rose-600 hover:bg-rose-700"
                )}
              >
                Confirm {remarksModal.action}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
