"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Layers,
  Search,
  CheckCircle2,
  RotateCcw,
  XCircle,
  CheckSquare,
  Square,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export function SubPackagesClient() {
  const [subPackages, setSubPackages] = useState<any[]>([]);
  const [activeSubPackageId, setActiveSubPackageId] = useState<string>("");
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMovementIds, setSelectedMovementIds] = useState<string[]>([]);

  const fetchSubPackageData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/assigned-office/sub-packages");
      if (res.ok) {
        const body = await res.json();
        const spList = body.subPackages || [];
        setSubPackages(spList);
        setItems(body.items || []);
        if (spList.length > 0 && !activeSubPackageId) {
          setActiveSubPackageId(spList[0].id || spList[0].name);
        }
      }
    } catch (err) {
      console.error("Failed to fetch sub packages", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubPackageData();
  }, []);

  // Filter items for the active subpackage tab & search
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesTab =
        item.subPackageId === activeSubPackageId ||
        item.subPackageId?.toLowerCase() === activeSubPackageId?.toLowerCase();

      if (!matchesTab) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        item.trackingNumber?.toLowerCase().includes(q) ||
        item.registration?.customerName?.toLowerCase().includes(q)
      );
    });
  }, [items, activeSubPackageId, searchQuery]);

  // Checkbox Selection Handlers
  const handleSelectAll = () => {
    if (selectedMovementIds.length === filteredItems.length) {
      setSelectedMovementIds([]);
    } else {
      setSelectedMovementIds(filteredItems.map((i) => i.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedMovementIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Perform Batch Action: Complete | Return | Reject
  const handleBatchAction = async (action: "complete" | "return" | "reject") => {
    if (selectedMovementIds.length === 0) {
      alert("Please select at least one document for this action.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/assigned-office/sub-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movementIds: selectedMovementIds,
          action,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || "Action failed");
      }

      alert(`Successfully performed ${action.toUpperCase()} on ${selectedMovementIds.length} item(s)!`);
      setSelectedMovementIds([]);
      fetchSubPackageData();
    } catch (err: any) {
      alert(err.message || "Failed to perform action");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/assigned-office"
            className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sub Packages Workflow</h1>
            <p className="text-sm text-slate-500">
              Manage and track all subpackage processing workflows efficiently
            </p>
          </div>
        </div>

        <Button
          onClick={fetchSubPackageData}
          variant="secondary"
          className="rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Horizontal SubPackage Tabs Bar */}
      <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-100/80 p-1.5 rounded-2xl gap-1">
        {subPackages.length === 0 ? (
          <div className="p-3 text-xs font-semibold text-slate-500">No active subpackages configured</div>
        ) : (
          subPackages.map((sp) => {
            const spId = sp.id || sp.name;
            const isActive = activeSubPackageId === spId;
            const count = items.filter(
              (i) => i.subPackageId === spId || i.subPackageId?.toLowerCase() === spId.toLowerCase()
            ).length;

            return (
              <button
                key={spId}
                onClick={() => {
                  setActiveSubPackageId(spId);
                  setSelectedMovementIds([]);
                }}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-blue-900 text-white shadow-sm"
                    : "bg-white/60 text-slate-700 hover:bg-white hover:text-slate-900"
                }`}
              >
                <Layers className="h-4 w-4" />
                {sp.name}
                {count > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-black ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-800"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Main Table Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        {/* Controls Header: Search & Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search tracking number or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-300 pl-9 pr-4 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-slate-700">
              {selectedMovementIds.length} Selected
            </span>

            <Button
              onClick={() => handleBatchAction("complete")}
              disabled={selectedMovementIds.length === 0 || isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl px-4 py-2 text-sm"
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Complete
            </Button>

            <Button
              onClick={() => handleBatchAction("return")}
              disabled={selectedMovementIds.length === 0 || isLoading}
              className="bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl px-4 py-2 text-sm"
            >
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Return
            </Button>

            <Button
              onClick={() => handleBatchAction("reject")}
              disabled={selectedMovementIds.length === 0 || isLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl px-4 py-2 text-sm"
            >
              <XCircle className="mr-1.5 h-4 w-4" />
              Reject
            </Button>
          </div>
        </div>

        {/* Table Content */}
        {filteredItems.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No Items in this Sub Package"
            description="Documents transferred to this subpackage will appear here for processing."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 tracking-wider">
                <tr>
                  <th className="p-4 w-10">
                    <button onClick={handleSelectAll}>
                      {selectedMovementIds.length === filteredItems.length ? (
                        <CheckSquare className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Square className="h-5 w-5 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="p-4">SL No.</th>
                  <th className="p-4">Tracking Number</th>
                  <th className="p-4">Customer Name</th>
                  <th className="p-4">Received Date</th>
                  <th className="p-4">Current Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredItems.map((item, idx) => {
                  const isSelected = selectedMovementIds.includes(item.id);
                  return (
                    <tr key={item.id} className={isSelected ? "bg-blue-50/50" : "hover:bg-slate-50"}>
                      <td className="p-4">
                        <button onClick={() => handleToggleSelect(item.id)}>
                          {isSelected ? (
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Square className="h-5 w-5 text-slate-400" />
                          )}
                        </button>
                      </td>
                      <td className="p-4 font-mono text-slate-500">{idx + 1}</td>
                      <td className="p-4 font-bold text-blue-600 font-mono text-base">
                        {item.trackingNumber}
                      </td>
                      <td className="p-4 font-medium text-slate-900">
                        {item.registration?.customerName || "N/A"}
                      </td>
                      <td className="p-4 text-xs text-slate-500">
                        {new Date(item.startedAt).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
