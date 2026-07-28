"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Layers,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  CheckSquare,
  Square,
  Building2,
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

        if (data.subPackages?.length > 0 && !activeSubPackageId) {
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

  // Filter items assigned to the active subpackage tab
  const activeItems = items.filter((item) => item.subPackageId === activeSubPackageId);

  // Toggle selection
  const toggleSelectMovement = (id: string) => {
    setSelectedMovementIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedMovementIds.length === activeItems.length) {
      setSelectedMovementIds([]);
    } else {
      setSelectedMovementIds(activeItems.map((item) => item.id));
    }
  };

  // Handle action (Complete, Return, Reject)
  const handleAction = async (actionType: "complete" | "return" | "reject") => {
    if (selectedMovementIds.length === 0) return;
    const confirmMessage =
      actionType === "complete"
        ? `Mark ${selectedMovementIds.length} item(s) as Complete?`
        : actionType === "return"
        ? `Return ${selectedMovementIds.length} item(s)?`
        : `Reject ${selectedMovementIds.length} item(s) back to Process Module?`;

    if (!confirm(confirmMessage)) return;

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
        }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Action failed", err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/assigned-office/workspace"
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
            >
              <ArrowLeft size={20} />
            </Link>
            <Layers className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Assigned Sub Packages View
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Process documents assigned to specific subpackages. Automated document completion triggers when all subpackages and Core Package complete.
          </p>
        </div>

        <Link href="/dashboard/assigned-office/workspace">
          <Button variant="secondary" className="gap-2 rounded-xl border-slate-300 dark:border-white/15">
            <Building2 size={16} />
            Back to Workspace
          </Button>
        </Link>
      </div>

      {/* Horizontal SubPackage Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200/80 pb-2 dark:border-white/10">
        {subPackages.map((sp) => {
          const isCore = sp.id === coreSubPackageId;
          const isActive = activeSubPackageId === sp.id;
          const count = items.filter((item) => item.subPackageId === sp.id).length;

          return (
            <button
              key={sp.id}
              onClick={() => {
                setActiveSubPackageId(sp.id);
                setSelectedMovementIds([]);
              }}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all",
                isActive
                  ? isCore
                    ? "bg-amber-600 text-white shadow-md shadow-amber-500/20"
                    : "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/60 dark:bg-white/5 dark:border-white/10 dark:text-slate-300"
              )}
            >
              {isCore && <Sparkles size={14} className="text-amber-200" />}
              <span>{sp.name}</span>
              {isCore && <span className="text-[10px] uppercase tracking-wider font-extrabold opacity-80">(CORE)</span>}
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-bold",
                  isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700 dark:bg-white/10"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Toolbar Buttons */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200/60 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-[#0f1115]">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={activeItems.length > 0 && selectedMovementIds.length === activeItems.length}
            onChange={toggleSelectAll}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {selectedMovementIds.length} selected
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            disabled={selectedMovementIds.length === 0 || processing}
            onClick={() => handleAction("complete")}
            className="gap-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-md"
          >
            <CheckCircle2 size={16} />
            Complete
          </Button>

          <Button
            disabled={selectedMovementIds.length === 0 || processing}
            onClick={() => handleAction("return")}
            className="gap-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 shadow-md"
          >
            <RotateCcw size={16} />
            Return
          </Button>

          <Button
            disabled={selectedMovementIds.length === 0 || processing}
            onClick={() => handleAction("reject")}
            className="gap-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 shadow-md"
          >
            <AlertTriangle size={16} />
            Reject
          </Button>
        </div>
      </div>

      {/* Subpackage Items Table */}
      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-xs overflow-hidden dark:border-white/10 dark:bg-[#0f1115]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="border-b border-slate-200/80 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-white/10 dark:bg-white/5">
              <tr>
                <th className="p-4 w-10"></th>
                <th className="p-4">Tracking Number</th>
                <th className="p-4">Customer Name</th>
                <th className="p-4">Document Type</th>
                <th className="p-4">Process Type</th>
                <th className="p-4">Assigned Sub Package</th>
                <th className="p-4">Status</th>
                <th className="p-4">Assigned Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin" />
                    <p className="mt-2 text-sm font-medium">Loading subpackage documents...</p>
                  </td>
                </tr>
              ) : activeItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No documents assigned to this subpackage.
                  </td>
                </tr>
              ) : (
                activeItems.map((item) => {
                  const isSelected = selectedMovementIds.includes(item.id);
                  const reg = item.registration;
                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        "hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors",
                        isSelected && "bg-blue-50/40 dark:bg-blue-500/10"
                      )}
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectMovement(item.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-4 font-bold text-blue-600 dark:text-blue-400">
                        {item.trackingNumber}
                      </td>
                      <td className="p-4 font-semibold text-slate-900 dark:text-white">
                        {reg?.customerName || "-"}
                      </td>
                      <td className="p-4 text-xs">{reg?.documentType || "-"}</td>
                      <td className="p-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                        {reg?.processType || "-"}
                      </td>
                      <td className="p-4 text-xs">
                        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                          {subPackages.find((sp) => sp.id === item.subPackageId)?.name || "Sub Package"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-500">
                        {new Date(item.startedAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
