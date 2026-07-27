"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Building2, 
  CheckCheck, 
  Clock, 
  FileText, 
  Inbox, 
  Layers, 
  LoaderCircle, 
  LogOut, 
  PackageCheck, 
  RotateCcw, 
  Send, 
  ShieldAlert, 
  UserCheck, 
  XCircle 
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatsCard } from "@/components/ui/StatsCard";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { ProcessItem, ProcessStats } from "../types/process.types";
import { MovementModal } from "./MovementModal";
import { ProcessHistoryTimeline } from "./ProcessHistoryTimeline";
import { LiveTimelineModal } from "@/features/registration/components/LiveTimelineModal";

const emptyStats: ProcessStats = {
  inbound: 0,
  inHand: 0,
  completed: 0,
  rejected: 0,
  outbound: 0,
  total: 0,
};

type ProcessTab = "in_hand" | "inbound" | "outbound" | "bundle";

export function ProcessDashboard() {
  const [activeTab, setActiveTab] = useState<ProcessTab>("in_hand");
  const [processType, setProcessType] = useState<string>("All");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<ProcessItem[]>([]);
  const [stats, setStats] = useState<ProcessStats>(emptyStats);

  // Modals state
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [targetAction, setTargetAction] = useState<"COMPLETED" | "REJECTED" | "SEND_TO_OFFICE">("COMPLETED");
  
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineTracking, setTimelineTracking] = useState<string | null>(null);

  const [availableProcessTypes, setAvailableProcessTypes] = useState<{ label: string; value: string }[]>([
    { label: "All", value: "All" }
  ]);

  useEffect(() => {
    async function fetchProcessTypes() {
      try {
        const res = await fetch("/api/master-data/process-types?active=true");
        if (res.ok) {
          const data = await res.json();
          const types = (data.items || []).map((i: any) => ({ label: i.name, value: i.name }));
          setAvailableProcessTypes([{ label: "All", value: "All" }, ...types]);
        }
      } catch (e) {
        console.error("Error fetching process types:", e);
      }
    }
    fetchProcessTypes();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const typeQuery = processType === "All" ? "" : `&processType=${encodeURIComponent(processType)}`;
      const res = await fetch(`/api/process?tab=${activeTab}${typeQuery}`, { cache: "no-store" });
      const payload = await res.json();
      
      if (!res.ok) {
        throw new Error(payload.message || "Failed to load process data");
      }

      setItems(payload.items || []);
      setStats(payload.stats || emptyStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading process data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [activeTab, processType]);

  function openMovementModal(assignmentId: string, action: "COMPLETED" | "REJECTED" | "SEND_TO_OFFICE") {
    setSelectedAssignmentId(assignmentId);
    setTargetAction(action);
    setMovementModalOpen(true);
  }

  function openTimeline(tracking: string) {
    setTimelineTracking(tracking);
    setTimelineOpen(true);
  }

  const cards = [
    { 
      label: "Document In Hand", 
      value: stats.inHand.toLocaleString(), 
      delta: "Active", 
      description: "Currently being processed", 
      icon: LoaderCircle, 
      tone: "blue" as const 
    },
    { 
      label: "Inbound", 
      value: stats.inbound.toLocaleString(), 
      delta: "Queued", 
      description: "Awaiting acceptance", 
      icon: Inbox, 
      tone: "amber" as const 
    },
    { 
      label: "Outbound", 
      value: stats.outbound.toLocaleString(), 
      delta: "Dispatched", 
      description: "Ready or sent to offices", 
      icon: Send, 
      tone: "blue" as const 
    },
    { 
      label: "Total Operations", 
      value: stats.total.toLocaleString(), 
      delta: "Total", 
      description: "All document movements", 
      icon: FileText, 
      tone: "slate" as const 
    },
  ];

  const tabsConfig = [
    { 
      key: "in_hand" as const, 
      label: "Document In Hand", 
      count: stats.inHand,
      description: "Live documents under processing" 
    },
    { 
      key: "inbound" as const, 
      label: "Inbound", 
      count: stats.inbound,
      description: "Documents incoming to office" 
    },
    { 
      key: "outbound" as const, 
      label: "Outbound", 
      count: stats.outbound,
      description: "Completed / Outgoing documents" 
    },
    { 
      key: "bundle" as const, 
      label: "Bundle Workflow", 
      count: 0,
      description: "Sub-package & bundle transfers" 
    },
  ];

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      {/* Top Banner with Header & Assigned Office Login Link */}
      <section className="relative overflow-hidden rounded-4xl border border-blue-100 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_42%),linear-gradient(135deg,#ffffff,#eff6ff)] p-6 shadow-(--shadow-card) sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-lg bg-blue-600/10 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                Process Module
              </span>
              <span className="inline-flex items-center rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700">
                Live Operations
              </span>
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
              Document Processing Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Manage document movement across stages (Inbound, In Hand, Outbound, Bundle Workflows) and execute process operations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Access to Assigned Office Login */}
            <Link href="/dashboard/assigned-office/workspace">
              <Button variant="secondary" className="gap-2 border-blue-200 bg-white font-semibold text-blue-700 shadow-sm hover:bg-blue-50">
                <Building2 size={16} />
                Assigned Office Login
              </Button>
            </Link>

            <div className="w-full sm:w-64">
              <SearchableSelect
                options={availableProcessTypes}
                value={processType}
                onChange={setProcessType}
                placeholder="Filter by Process Type"
              />
            </div>
          </div>
        </div>
      </section>

      {/* KPI Stats Cards */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatsCard key={card.label} {...card} />
        ))}
      </section>

      {/* Navigation Tabs */}
      <section className="rounded-[28px] border border-(--border) bg-white/80 p-3 shadow-(--shadow-card)">
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {tabsConfig.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={[
                  "flex-1 min-w-[150px] rounded-2xl border px-4 py-3 text-left transition-all duration-200",
                  active
                    ? "border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                    : "border-(--border) bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/50",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </div>
                <span className={`mt-1 block text-xs ${active ? "text-blue-100" : "text-slate-500"}`}>
                  {tab.description}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Error Message if any */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700">
          <ShieldAlert size={18} />
          <p>{error}</p>
        </div>
      )}

      {/* Main Table / Content Section */}
      {loading ? (
        <div className="rounded-[28px] border border-(--border) bg-white p-12 text-center shadow-(--shadow-card)">
          <LoaderCircle size={28} className="mx-auto animate-spin text-blue-600" />
          <p className="mt-3 text-sm font-medium text-slate-600">Loading process documents...</p>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title={`No documents in ${activeTab.replace("_", " ")}`}
          description="There are currently no document assignments matching this stage or filter."
        />
      ) : (
        <div className="min-w-0 overflow-hidden rounded-[28px] border border-(--border) bg-white shadow-(--shadow-card)">
          <div className="overflow-x-auto">
            <table className="w-full min-w-255 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-5 py-4">Tracking Number</th>
                  <th className="px-5 py-4">Client Name</th>
                  <th className="px-5 py-4">Process Type</th>
                  <th className="px-5 py-4">Received Date</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Process Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border) bg-white">
                {items.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-50/70">
                    <td className="px-5 py-4 font-bold text-blue-600">
                      <button 
                        type="button" 
                        onClick={() => openTimeline(item.trackingNumber)} 
                        className="hover:underline flex items-center gap-1.5"
                      >
                        {item.trackingNumber}
                      </button>
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-900">{item.clientName}</td>
                    <td className="px-5 py-4 text-slate-600">{item.processType}</td>
                    <td className="px-5 py-4 text-slate-500">{item.receivedDate}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        item.status === "COMPLETED"
                          ? "bg-emerald-50 text-emerald-700"
                          : item.status === "REJECTED"
                          ? "bg-rose-50 text-rose-700"
                          : item.status === "INBOUND"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-blue-50 text-blue-700"
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="border-rose-200 text-rose-600 hover:bg-rose-50"
                          onClick={() => openMovementModal(item.id, "REJECTED")}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="border-blue-200 text-blue-700 hover:bg-blue-50"
                          onClick={() => openMovementModal(item.id, "SEND_TO_OFFICE")}
                        >
                          Send To Office
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => openMovementModal(item.id, "COMPLETED")}
                        >
                          Complete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Movement Modal */}
      {movementModalOpen && selectedAssignmentId && (
        <MovementModal
          open={movementModalOpen}
          onClose={() => setMovementModalOpen(false)}
          title={`Process Document Operation`}
          description="Confirm action to update document movement status."
          action={targetAction}
          assignmentId={selectedAssignmentId}
          onSuccess={loadData}
        />
      )}

      {/* Live Timeline Modal */}
      {timelineOpen && timelineTracking && (
        <LiveTimelineModal
          isOpen={timelineOpen}
          onClose={() => setTimelineOpen(false)}
          trackingNumber={timelineTracking}
        />
      )}
    </div>
  );
}
