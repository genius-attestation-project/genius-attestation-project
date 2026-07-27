"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  Inbox,
  FileCheck2,
  CheckCircle,
  RotateCcw,
  AlertTriangle,
  History,
  LogOut,
  Layers,
  ArrowRightLeft,
  Send,
  Building2,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";

type WorkspaceProps = {
  officeName: string;
  currentUser: string;
  officeId: string;
};

export function AssignedOfficeWorkspaceClient({
  officeName,
  currentUser,
  officeId,
}: WorkspaceProps) {
  const [activeTab, setActiveTab] = useState<
    "inbound" | "in_hand" | "complete" | "return" | "rejected" | "history"
  >("inbound");

  const [stats, setStats] = useState({
    inboundCount: 0,
    inHandCount: 0,
    completedCount: 0,
    returnedCount: 0,
    rejectedCount: 0,
    historyCount: 0,
  });

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTrackingNumbers, setSelectedTrackingNumbers] = useState<string[]>([]);

  // Assigned Sub Packages for this office (for Transfer modal)
  const [officeSubPackages, setOfficeSubPackages] = useState<any[]>([]);

  // Bundle Receive Modal
  const [selectedBundle, setSelectedBundle] = useState<any | null>(null);
  const [bundleSelectedTrackings, setBundleSelectedTrackings] = useState<string[]>([]);
  const [receiving, setReceiving] = useState(false);

  // Transfer To Sub Package Modal
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferAssignments, setTransferAssignments] = useState<Record<string, string>>({});
  const [transferring, setTransferring] = useState(false);

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/assigned-office/workspace?action=stats&officeId=${officeId}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to load workspace stats", err);
    }
  }, [officeId]);

  // Fetch Documents / Bundles by Tab
  const fetchTabData = useCallback(async () => {
    setLoading(true);
    setSelectedTrackingNumbers([]);
    try {
      const res = await fetch(
        `/api/assigned-office/workspace?officeId=${officeId}&tab=${activeTab}&search=${encodeURIComponent(
          search
        )}`
      );
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (err) {
      console.error("Failed to load tab data", err);
    } finally {
      setLoading(false);
    }
  }, [officeId, activeTab, search]);

  // Fetch Office SubPackages
  useEffect(() => {
    fetch(`/api/assigned-office/workspace?action=subpackage_items&officeId=${officeId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.subPackages) setOfficeSubPackages(data.subPackages);
      })
      .catch((err) => console.error("Failed to load office subpackages", err));
  }, [officeId]);

  useEffect(() => {
    fetchStats();
    fetchTabData();
  }, [fetchStats, fetchTabData]);

  // Click Bundle Card (Inbound)
  const handleOpenBundleModal = (bundle: any) => {
    setSelectedBundle(bundle);
    setBundleSelectedTrackings(bundle.items.map((item: any) => item.trackingNumber));
  };

  // Toggle item selection in bundle modal
  const toggleBundleItem = (trackingNumber: string) => {
    setBundleSelectedTrackings((prev) =>
      prev.includes(trackingNumber)
        ? prev.filter((t) => t !== trackingNumber)
        : [...prev, trackingNumber]
    );
  };

  // Handle Receive Bundle Items
  const handleReceiveBundle = async () => {
    if (!selectedBundle || bundleSelectedTrackings.length === 0) return;
    setReceiving(true);
    try {
      const res = await fetch("/api/assigned-office/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "receive_bundle",
          officeId,
          bundleId: selectedBundle.id,
          selectedTrackingNumbers: bundleSelectedTrackings,
        }),
      });

      if (res.ok) {
        setSelectedBundle(null);
        fetchStats();
        fetchTabData();
      }
    } catch (err) {
      console.error("Failed to receive bundle", err);
    } finally {
      setReceiving(false);
    }
  };

  // Toggle Document Selection in Document In Hand
  const toggleSelectDocument = (tNum: string) => {
    setSelectedTrackingNumbers((prev) =>
      prev.includes(tNum) ? prev.filter((item) => item !== tNum) : [...prev, tNum]
    );
  };

  // Select all in Document In Hand
  const toggleSelectAllDocuments = () => {
    if (selectedTrackingNumbers.length === items.length) {
      setSelectedTrackingNumbers([]);
    } else {
      setSelectedTrackingNumbers(items.map((doc: any) => doc.trackingNumber));
    }
  };

  // Open Transfer to Sub Package Modal
  const handleOpenTransferModal = () => {
    if (selectedTrackingNumbers.length === 0) return;
    const initialMap: Record<string, string> = {};
    selectedTrackingNumbers.forEach((tNum) => {
      initialMap[tNum] = officeSubPackages[0]?.id || "";
    });
    setTransferAssignments(initialMap);
    setIsTransferModalOpen(true);
  };

  // Submit Transfer to Sub Package
  const handleTransferToSubPackageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferring(true);
    try {
      const payloadItems = Object.entries(transferAssignments).map(
        ([trackingNumber, subPackageId]) => ({
          trackingNumber,
          subPackageId,
        })
      );

      const res = await fetch("/api/assigned-office/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "transfer_to_subpackage",
          officeId,
          items: payloadItems,
        }),
      });

      if (res.ok) {
        setIsTransferModalOpen(false);
        fetchStats();
        fetchTabData();
      }
    } catch (err) {
      console.error("Failed to transfer to subpackage", err);
    } finally {
      setTransferring(false);
    }
  };

  // Action: Back To Process
  const handleBackToProcess = async () => {
    if (selectedTrackingNumbers.length === 0) return;
    if (!confirm(`Transfer ${selectedTrackingNumbers.length} document(s) back to Process Module?`))
      return;

    try {
      const res = await fetch("/api/assigned-office/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "back_to_process",
          officeId,
          trackingNumbers: selectedTrackingNumbers,
        }),
      });

      if (res.ok) {
        fetchStats();
        fetchTabData();
      }
    } catch (err) {
      console.error("Failed to transfer back to process", err);
    }
  };

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Top Workspace Header */}
      <div className="rounded-3xl border border-slate-200/80 bg-linear-to-r from-slate-900 via-slate-800 to-blue-950 p-6 text-white shadow-xl dark:border-white/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-400/30 shadow-inner">
              <Building2 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{officeName}</h1>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
                  Active Workspace
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Logged in as: <span className="font-semibold text-white">{currentUser}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/dashboard/assigned-office/sub-packages">
              <Button className="gap-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 shadow-md">
                <Layers size={16} />
                View Sub Packages
              </Button>
            </Link>

            <Button
              variant="secondary"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="gap-2 rounded-xl border-white/20 text-white hover:bg-white/10"
            >
              <LogOut size={16} />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200/80 pb-2 dark:border-white/10">
        {[
          { id: "inbound", label: "Inbound", count: stats.inboundCount, icon: Inbox },
          { id: "in_hand", label: "Document In Hand", count: stats.inHandCount, icon: FileCheck2 },
          {
            id: "complete",
            label: "Document Complete",
            count: stats.completedCount,
            icon: CheckCircle,
          },
          { id: "return", label: "Document Return", count: stats.returnedCount, icon: RotateCcw },
          { id: "rejected", label: "Rejected", count: stats.rejectedCount, icon: AlertTriangle },
          { id: "history", label: "History", count: stats.historyCount, icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all",
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/60 dark:bg-white/5 dark:border-white/10 dark:text-slate-300"
              )}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-bold",
                  isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700 dark:bg-white/10"
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Action Toolbar for Document In Hand */}
      {activeTab === "in_hand" && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0f1115]">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={items.length > 0 && selectedTrackingNumbers.length === items.length}
              onChange={toggleSelectAllDocuments}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {selectedTrackingNumbers.length} selected
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              disabled={selectedTrackingNumbers.length === 0}
              onClick={handleBackToProcess}
              className="gap-2 rounded-xl border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-white"
            >
              <ArrowRightLeft size={16} />
              Back To Process
            </Button>

            <Button
              disabled={selectedTrackingNumbers.length === 0}
              onClick={handleOpenTransferModal}
              className="gap-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-md"
            >
              <Send size={16} />
              Transfer To Sub Package
            </Button>
          </div>
        </div>
      )}

      {/* Main Tab Content */}
      <div className="space-y-4">
        {loading ? (
          <div className="rounded-2xl border border-slate-200/60 bg-white p-12 text-center text-slate-400 dark:border-white/10 dark:bg-[#0f1115]">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin" />
            <p className="mt-2 text-sm font-medium">Loading documents...</p>
          </div>
        ) : activeTab === "inbound" ? (
          /* INBOUND TAB: Bundle Cards */
          items.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/60 bg-white p-12 text-center text-slate-500 dark:border-white/10 dark:bg-[#0f1115]">
              <Inbox className="mx-auto h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No Inbound Bundles
              </p>
              <p className="text-xs text-slate-400">
                Transferred document bundles from Process Module or BM Report will appear here.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((bundle) => (
                <div
                  key={bundle.id}
                  onClick={() => handleOpenBundleModal(bundle)}
                  className="cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-blue-500 hover:shadow-md dark:border-white/10 dark:bg-[#0f1115]"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-white/10">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      {bundle.bundleNumber}
                    </span>
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                      {bundle.status}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>From Office:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {bundle.fromOffice?.officeName || "Main Process Office"}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Transferred Date:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {new Date(bundle.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-600 dark:text-slate-400 pt-1">
                      <span>Document Count:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                        {bundle.items?.length || 0} docs
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-3 text-center text-xs font-bold text-blue-600 dark:border-white/10 dark:text-blue-400">
                    Click to Open Bundle & Receive →
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Standard Documents Table for Document In Hand, Complete, Return, Rejected, History */
          <div className="rounded-2xl border border-slate-200/60 bg-white shadow-xs overflow-hidden dark:border-white/10 dark:bg-[#0f1115]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="border-b border-slate-200/80 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-white/10 dark:bg-white/5">
                  <tr>
                    {activeTab === "in_hand" && <th className="p-4 w-10"></th>}
                    {activeTab === "history" ? (
                      <>
                        <th className="p-4">Tracking Number</th>
                        <th className="p-4">Step</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Performed By</th>
                        <th className="p-4">Date</th>
                        <th className="p-4">Remarks</th>
                      </>
                    ) : (
                      <>
                        <th className="p-4">Tracking Number</th>
                        <th className="p-4">Customer Name</th>
                        <th className="p-4">Document Type</th>
                        <th className="p-4">Process Type</th>
                        <th className="p-4">Sub Package</th>
                        <th className="p-4">Delivery Location</th>
                        <th className="p-4">Status</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-500">
                        No documents found in this section.
                      </td>
                    </tr>
                  ) : (
                    items.map((row: any) => {
                      if (activeTab === "history") {
                        return (
                          <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-white/5">
                            <td className="p-4 font-bold text-blue-600 dark:text-blue-400">
                              {row.trackingNumber}
                            </td>
                            <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">
                              {row.workflowStep}
                            </td>
                            <td className="p-4">
                              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-300">
                                {row.status}
                              </span>
                            </td>
                            <td className="p-4 text-xs">{row.performedBy || "System"}</td>
                            <td className="p-4 text-xs text-slate-500">
                              {new Date(row.performedAt).toLocaleString()}
                            </td>
                            <td className="p-4 text-xs text-slate-500">{row.remarks || "-"}</td>
                          </tr>
                        );
                      }

                      const isSelected = selectedTrackingNumbers.includes(row.trackingNumber);
                      return (
                        <tr
                          key={row.id}
                          className={cn(
                            "hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors",
                            isSelected && "bg-blue-50/40 dark:bg-blue-500/10"
                          )}
                        >
                          {activeTab === "in_hand" && (
                            <td className="p-4">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectDocument(row.trackingNumber)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                          )}
                          <td className="p-4 font-bold text-blue-600 dark:text-blue-400">
                            {row.trackingNumber}
                          </td>
                          <td className="p-4 font-semibold text-slate-900 dark:text-white">
                            {row.customerName}
                          </td>
                          <td className="p-4 text-xs">{row.documentType || "-"}</td>
                          <td className="p-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                            {row.processType || "-"}
                          </td>
                          <td className="p-4 text-xs text-slate-600 dark:text-slate-400">
                            {row.subPackage || "-"}
                          </td>
                          <td className="p-4 text-xs text-slate-600 dark:text-slate-400">
                            {row.deliveryLocation || "-"}
                          </td>
                          <td className="p-4">
                            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                              {row.trackingStatus || row.documentMovements?.[0]?.currentStatus || "In Hand"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* BUNDLE RECEIVE MODAL */}
      {selectedBundle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#0f1115] dark:border dark:border-white/10 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 dark:border-white/10">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Bundle Details: {selectedBundle.bundleNumber}
                </h2>
                <p className="text-xs text-slate-500">
                  Select documents to receive into Document In Hand. Partial receive supported.
                </p>
              </div>
              <button
                onClick={() => setSelectedBundle(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span>Documents in Bundle ({selectedBundle.items.length}):</span>
                <button
                  type="button"
                  onClick={() => {
                    if (bundleSelectedTrackings.length === selectedBundle.items.length) {
                      setBundleSelectedTrackings([]);
                    } else {
                      setBundleSelectedTrackings(
                        selectedBundle.items.map((i: any) => i.trackingNumber)
                      );
                    }
                  }}
                  className="text-blue-600 font-bold hover:underline"
                >
                  {bundleSelectedTrackings.length === selectedBundle.items.length
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 rounded-2xl border border-slate-200/60 p-2 dark:divide-white/10 dark:border-white/10">
                {selectedBundle.items.map((item: any) => {
                  const isChecked = bundleSelectedTrackings.includes(item.trackingNumber);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleBundleItem(item.trackingNumber)}
                      className="flex cursor-pointer items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        {isChecked ? (
                          <CheckSquare className="text-blue-600" size={18} />
                        ) : (
                          <Square className="text-slate-300" size={18} />
                        )}
                        <span className="font-bold text-slate-900 dark:text-white text-xs">
                          {item.trackingNumber}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">{item.status}</span>
                    </div>
                  );
                })}
              </div>

              {bundleSelectedTrackings.length < selectedBundle.items.length && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                  ⚠️ Note: Unselected documents will automatically remain in an Inbound bundle for later reception.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200/80 pt-4 dark:border-white/10">
              <Button
                variant="secondary"
                onClick={() => setSelectedBundle(null)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                disabled={bundleSelectedTrackings.length === 0 || receiving}
                onClick={handleReceiveBundle}
                className="rounded-xl bg-blue-600 text-white hover:bg-blue-700"
              >
                {receiving
                  ? "Receiving..."
                  : `Receive (${bundleSelectedTrackings.length}) Documents`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSFER TO SUB PACKAGE MODAL */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#0f1115] dark:border dark:border-white/10 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 dark:border-white/10">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Transfer To Sub Package
                </h2>
                <p className="text-xs text-slate-500">
                  Select ONE Sub Package for each document (filtered by Process Type from Master Configuration).
                </p>
              </div>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTransferToSubPackageSubmit} className="space-y-4">
              <div className="max-h-80 overflow-y-auto space-y-4 rounded-2xl border border-slate-200/60 p-4 dark:border-white/10 bg-slate-50/50 dark:bg-white/5">
                {selectedTrackingNumbers.map((tNum) => {
                  const docItem = items.find((i) => i.trackingNumber === tNum);
                  const docTitle = docItem ? `${docItem.documentType || "Document"} (${docItem.customerName})` : tNum;
                  const procType = docItem?.processType || "General";

                  return (
                    <div key={tNum} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#0f1115] shadow-xs space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 dark:border-white/10 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                            {tNum}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            • {docTitle}
                          </span>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-white/10 dark:text-slate-300">
                          Process: {procType}
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          Select Sub Package (Max 1):
                        </label>
                        <select
                          required
                          value={transferAssignments[tNum] || ""}
                          onChange={(e) =>
                            setTransferAssignments({
                              ...transferAssignments,
                              [tNum]: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-[#0f1115] dark:text-white"
                        >
                          <option value="">-- Choose Sub Package --</option>
                          {officeSubPackages.map((sp) => (
                            <option key={sp.id} value={sp.id}>
                              {sp.name} {sp.isCorePackage ? "★ (CORE PACKAGE)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200/80 pt-4 dark:border-white/10">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={transferring}
                  className="rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                >
                  {transferring ? "Transferring..." : "Confirm Sub Package Transfer"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
