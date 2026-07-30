"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  XCircle,
  History,
  ArrowRightLeft,
  CheckCircle2,
  CheckSquare,
  Square,
  CornerUpLeft
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

type ModalAction =
  | "COMPLETED"
  | "REJECTED"
  | "SEND_TO_OFFICE"
  | "RECEIVE"
  | "RETURN"
  | "TRANSFER_TO_HOME"
  | "TRANSFER_TO_ASSIGNED_OFFICE";

export function ProcessDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProcessTab>("in_hand");
  const [processType, setProcessType] = useState<string>("All");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<ProcessItem[]>([]);
  const [stats, setStats] = useState<ProcessStats>(emptyStats);

  // Checkbox multi-selection state
  const [selectedTrackingNumbers, setSelectedTrackingNumbers] = useState<string[]>([]);

  // Assigned Office Login Selector state
  const [assignedOfficeOptions, setAssignedOfficeOptions] = useState<{ label: string; value: string }[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>("");
  const [loadingOffices, setLoadingOffices] = useState(false);

  // Modals state
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [targetAction, setTargetAction] = useState<ModalAction>("COMPLETED");
  const [modalTrackingNumbers, setModalTrackingNumbers] = useState<string[]>([]);
  const [modalAssignmentId, setModalAssignmentId] = useState<string | undefined>(undefined);
  
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineTracking, setTimelineTracking] = useState<string | null>(null);

  const [availableProcessTypes, setAvailableProcessTypes] = useState<{ label: string; value: string }[]>([
    { label: "All", value: "All" }
  ]);

  // Load process types
  useEffect(() => {
    async function fetchProcessTypes() {
      try {
        const res = await fetch("/api/master-data/attestation-types?active=true");
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

  // Load active assigned office accounts for selector
  useEffect(() => {
    async function fetchAssignedOffices() {
      setLoadingOffices(true);
      try {
        const res = await fetch("/api/assigned-office?pageSize=100&status=Active");
        if (res.ok) {
          const data = await res.json();
          const list = (data.items || []).map((o: any) => ({
            label: o.officeName || o.username || o.name || "Assigned Office",
            value: o.id,
          }));
          setAssignedOfficeOptions(list);
          if (list.length > 0) {
            setSelectedOfficeId(list[0].value);
          }
        }
      } catch (e) {
        console.error("Error fetching assigned offices for selector:", e);
      } finally {
        setLoadingOffices(false);
      }
    }
    fetchAssignedOffices();
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
    setSelectedTrackingNumbers([]);
  }, [activeTab, processType]);

  // Multi-selection helpers
  const handleSelectAll = () => {
    if (selectedTrackingNumbers.length === items.length) {
      setSelectedTrackingNumbers([]);
    } else {
      setSelectedTrackingNumbers(items.map((i) => i.trackingNumber));
    }
  };

  const handleToggleSelect = (trackingNumber: string) => {
    setSelectedTrackingNumbers((prev) =>
      prev.includes(trackingNumber)
        ? prev.filter((t) => t !== trackingNumber)
        : [...prev, trackingNumber]
    );
  };

  // Open modal for selected bulk items or single item
  function openBulkMovementModal(
    action: ModalAction,
    singleTracking?: string,
    singleId?: string
  ) {
    const trackings = singleTracking ? [singleTracking] : selectedTrackingNumbers;
    if (trackings.length === 0) {
      alert("Please select at least one document to execute this action.");
      return;
    }
    setModalTrackingNumbers(trackings);
    setModalAssignmentId(singleId);
    setTargetAction(action);
    setMovementModalOpen(true);
  }

  function openTimeline(tracking: string) {
    setTimelineTracking(tracking);
    setTimelineOpen(true);
  }

  function handleOfficeLogin() {
    if (selectedOfficeId) {
      document.cookie = `activeAssignedOfficeId=${selectedOfficeId}; path=/; max-age=86400; SameSite=Lax`;
      router.push(`/dashboard/assigned-office/workspace?officeId=${selectedOfficeId}`);
    }
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
      description: "Incoming from Assigned Office", 
      icon: Inbox, 
      tone: "amber" as const 
    },
    { 
      label: "Outbound", 
      value: stats.outbound.toLocaleString(), 
      delta: "Dispatched", 
      description: "Sent to BM Report or Assigned Office", 
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
      description: "Incoming from Assigned Office" 
    },
    { 
      key: "outbound" as const, 
      label: "Outbound", 
      count: stats.outbound,
      description: "Completed / Outgoing documents" 
    },
    { 
      key: "bundle" as const, 
      label: "Bundle Movement", 
      count: 0,
      description: "Sub-package & bundle transfers" 
    },
  ];

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      {/* Top Banner with Header & Assigned Office Login Selector */}
      <section className="relative overflow-hidden rounded-4xl border border-blue-100 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_42%),linear-gradient(135deg,#ffffff,#eff6ff)] p-6 shadow-(--shadow-card) sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-lg bg-blue-600/10 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                Process Module
              </span>
              <span className="inline-flex items-center rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700">
                Live Operations
              </span>
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
              Process Module Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Manage document processing workflows. Receive from Assigned Office, transfer to BM Report or Assigned Office, and track movement history.
            </p>
          </div>

          {/* Single Responsive Action Bar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-blue-200/80 bg-white/95 p-3.5 shadow-sm backdrop-blur-xs sm:flex-row sm:items-center sm:gap-3">
            {/* Assigned Office Dropdown (Width: ~320px - 350px) */}
            <div className="w-full sm:w-[320px] md:w-87.5 shrink-0">
              <SearchableSelect
                options={assignedOfficeOptions}
                value={selectedOfficeId}
                onChange={setSelectedOfficeId}
                placeholder={loadingOffices ? "Loading assigned offices..." : "Select Assigned Office"}
              />
            </div>

            {/* Login Button immediately beside Assigned Office Dropdown */}
            <Button
              disabled={!selectedOfficeId || loadingOffices}
              onClick={handleOfficeLogin}
              className="h-10.5 gap-2 rounded-xl bg-blue-600 px-5 text-xs font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-50 shrink-0"
            >
              <Building2 size={16} />
              <span>Login</span>
            </Button>

            {/* Process Type Filter */}
            <div className="w-full sm:w-55 shrink-0">
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

      {/* Workflow Navigation Tabs */}
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
                  "flex-1 min-w-37.5 rounded-2xl border px-4 py-3 text-left transition-all duration-200",
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

      {/* Bulk Operations Toolbar */}
      {items.length > 0 && (activeTab === "in_hand" || activeTab === "inbound") && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-blue-50/80 border border-blue-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
            <span>Selected: {selectedTrackingNumbers.length} of {items.length} documents</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeTab === "in_hand" && (
              <>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shadow-sm"
                  disabled={selectedTrackingNumbers.length === 0}
                  onClick={() => openBulkMovementModal("TRANSFER_TO_HOME")}
                >
                  <Send size={14} />
                  Transfer To Home
                </Button>

                <Button
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1.5 shadow-sm"
                  disabled={selectedTrackingNumbers.length === 0}
                  onClick={() => openBulkMovementModal("TRANSFER_TO_ASSIGNED_OFFICE")}
                >
                  <Building2 size={14} />
                  Transfer To Assigned Office
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  className="border-amber-200 text-amber-700 hover:bg-amber-50 font-semibold gap-1.5"
                  disabled={selectedTrackingNumbers.length === 0}
                  onClick={() => openBulkMovementModal("RETURN")}
                >
                  <RotateCcw size={14} />
                  Return
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  className="border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold gap-1.5"
                  disabled={selectedTrackingNumbers.length === 0}
                  onClick={() => openBulkMovementModal("REJECTED")}
                >
                  <XCircle size={14} />
                  Reject
                </Button>

                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-sm"
                  disabled={selectedTrackingNumbers.length === 0}
                  onClick={() => openBulkMovementModal("COMPLETED")}
                >
                  <CheckCircle2 size={14} />
                  Complete
                </Button>
              </>
            )}

            {activeTab === "inbound" && (
              <>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-sm"
                  disabled={selectedTrackingNumbers.length === 0}
                  onClick={() => openBulkMovementModal("RECEIVE")}
                >
                  <CheckCheck size={14} />
                  Receive Selected ({selectedTrackingNumbers.length})
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  className="border-amber-200 text-amber-700 hover:bg-amber-50 font-semibold gap-1.5"
                  disabled={selectedTrackingNumbers.length === 0}
                  onClick={() => openBulkMovementModal("RETURN")}
                >
                  <RotateCcw size={14} />
                  Return Selected
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  className="border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold gap-1.5"
                  disabled={selectedTrackingNumbers.length === 0}
                  onClick={() => openBulkMovementModal("REJECTED")}
                >
                  <XCircle size={14} />
                  Reject Selected
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Operations Table */}
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
                  <th className="px-4 py-4 w-10">
                    <button type="button" onClick={handleSelectAll} className="text-slate-600">
                      {selectedTrackingNumbers.length === items.length && items.length > 0 ? (
                        <CheckSquare className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Square className="h-5 w-5 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="px-5 py-4">Tracking Number</th>
                  <th className="px-5 py-4">Client Name</th>
                  <th className="px-5 py-4">Process Type</th>
                  <th className="px-5 py-4">Received Date</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Process Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border) bg-white">
                {items.map((item) => {
                  const isSelected = selectedTrackingNumbers.includes(item.trackingNumber);
                  return (
                    <tr key={item.id} className={`transition ${isSelected ? "bg-blue-50/50" : "hover:bg-slate-50/70"}`}>
                      <td className="px-4 py-4">
                        <button type="button" onClick={() => handleToggleSelect(item.trackingNumber)} className="text-slate-600">
                          {isSelected ? (
                            <CheckSquare className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Square className="h-5 w-5 text-slate-400" />
                          )}
                        </button>
                      </td>
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
                            : item.status === "INBOUND" || item.status === "Pending Receive"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-blue-50 text-blue-700"
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {/* Dedicated Action Buttons */}
                          {activeTab === "inbound" && (
                            <>
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => openBulkMovementModal("RECEIVE", item.trackingNumber, item.id)}
                              >
                                Receive
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="border-amber-200 text-amber-700 hover:bg-amber-50"
                                onClick={() => openBulkMovementModal("RETURN", item.trackingNumber, item.id)}
                              >
                                Return
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="border-rose-200 text-rose-600 hover:bg-rose-50"
                                onClick={() => openBulkMovementModal("REJECTED", item.trackingNumber, item.id)}
                              >
                                Reject
                              </Button>
                            </>
                          )}

                          {activeTab === "in_hand" && (
                            <>
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                                onClick={() => openBulkMovementModal("TRANSFER_TO_HOME", item.trackingNumber, item.id)}
                              >
                                Transfer To Home
                              </Button>
                              <Button
                                size="sm"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                                onClick={() => openBulkMovementModal("TRANSFER_TO_ASSIGNED_OFFICE", item.trackingNumber, item.id)}
                              >
                                Transfer To Assigned Office
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="border-amber-200 text-amber-700 hover:bg-amber-50"
                                onClick={() => openBulkMovementModal("RETURN", item.trackingNumber, item.id)}
                              >
                                Return
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="border-rose-200 text-rose-600 hover:bg-rose-50"
                                onClick={() => openBulkMovementModal("REJECTED", item.trackingNumber, item.id)}
                              >
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                onClick={() => openBulkMovementModal("COMPLETED", item.trackingNumber, item.id)}
                              >
                                Complete
                              </Button>
                            </>
                          )}

                          {(activeTab === "outbound" || activeTab === "bundle") && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="border-slate-200 text-slate-700 hover:bg-slate-100 gap-1.5"
                              onClick={() => openTimeline(item.trackingNumber)}
                            >
                              <History size={14} />
                              Movement History
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Operation Action Modal */}
      {movementModalOpen && (
        <MovementModal
          open={movementModalOpen}
          onClose={() => setMovementModalOpen(false)}
          title={`Process Operation: ${targetAction.replace(/_/g, " ")}`}
          description="Confirm details and target options to log this document movement."
          action={targetAction}
          assignmentId={modalAssignmentId}
          trackingNumbers={modalTrackingNumbers}
          onSuccess={() => {
            loadData();
            setSelectedTrackingNumbers([]);
          }}
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
