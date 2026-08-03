"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate, formatBundleNumber } from "@/utils/format";
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
import { RetrieveConfirmationModal } from "@/features/document-movement/components/RetrieveConfirmationModal";
import { StatsCard } from "@/components/ui/StatsCard";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { PriorityDot } from "@/components/ui/PriorityDot";
import { calculateNumberOfDays, calculateFinishedDays } from "@/utils/days-calculator";
import { ProcessItem, ProcessStats } from "../types/process.types";
import { MovementModal } from "./MovementModal";
import { ProcessHistoryTimeline } from "./ProcessHistoryTimeline";
import { LiveTimelineModal } from "@/features/registration/components/LiveTimelineModal";
import { BundlePreviewModal } from "@/components/ui/BundlePreviewModal";
import { ReceiveSelectionModal } from "@/components/ui/ReceiveSelectionModal";

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
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [items, setItems] = useState<ProcessItem[]>([]);
  const [stats, setStats] = useState<ProcessStats>(emptyStats);

  // Checkbox multi-selection state
  const [selectedTrackingNumbers, setSelectedTrackingNumbers] = useState<string[]>([]);

  // Assigned Office Login Selector state
  const [assignedOfficeOptions, setAssignedOfficeOptions] = useState<{ label: string; value: string }[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>("");
  const [loadingOffices, setLoadingOffices] = useState(false);

  // Document In Hand transfer bar: office-location records only.
  const [destinationOfficeId, setDestinationOfficeId] = useState("");
  const [destinationOffices, setDestinationOffices] = useState<{ id: string; officeName: string }[]>([]);
  const [isTransferring, setIsTransferring] = useState(false);

  // Modals state
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [targetAction, setTargetAction] = useState<ModalAction>("COMPLETED");
  const [modalTrackingNumbers, setModalTrackingNumbers] = useState<string[]>([]);
  const [modalAssignmentId, setModalAssignmentId] = useState<string | undefined>(undefined);
  
  // Retrieve Modal State
  const [retrieveItem, setRetrieveItem] = useState<any | null>(null);
  
  // Bundle Preview state before receiving
  const [previewItem, setPreviewItem] = useState<any | null>(null);
  
  // Receive Selection state before receiving
  const [receiveSelectionItem, setReceiveSelectionItem] = useState<any | null>(null);
  const [isReceiving, setIsReceiving] = useState(false);
  
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineTracking, setTimelineTracking] = useState<string | null>(null);

  const [availableProcessTypes, setAvailableProcessTypes] = useState<{ label: string; value: string }[]>([
    { label: "All", value: "All" }
  ]);

  const priorityFilterOptions = [
    { label: "All Priorities", value: "All" },
    { label: "Normal", value: "Normal", customRender: <PriorityBadge priority="Normal" /> },
    { label: "Express", value: "Express", customRender: <PriorityBadge priority="Express" /> },
    { label: "Super Fast", value: "Super Fast", customRender: <PriorityBadge priority="Super Fast" /> },
  ];

  const displayedItems = items.filter((i) => priorityFilter === "All" || (i.priority || "Normal") === priorityFilter);

  // Load process types
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

  useEffect(() => {
    async function fetchDestinationOffices() {
      try {
        const res = await fetch("/api/offices/all");
        if (!res.ok) return;
        const payload = await res.json();
        // The shared endpoint also returns Assigned Office accounts. The Process
        // toolbar intentionally exposes only persisted Office Location records.
        setDestinationOffices(
          (payload.offices || payload.data || []).filter((office: any) => office.type === "Office Location")
        );
      } catch (err) {
        console.error("Failed to load destination offices", err);
      }
    }
    fetchDestinationOffices();
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

  function openReceiveSelection(item: ProcessItem) {
    // A bundle stays intact: the popup merely exposes its existing documents for
    // selection and submits their existing tracking identifiers to the receive API.
    const bundleDocuments = item.bundleId
      ? items.filter((candidate) => candidate.bundleId === item.bundleId)
      : [item];

    setReceiveSelectionItem({ items: bundleDocuments });
  }

  async function receiveSelectedDocuments(selectedTrackingNumbers: string[]) {
    if (selectedTrackingNumbers.length === 0) return;

    setIsReceiving(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/process/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingNumbers: selectedTrackingNumbers,
          action: "RECEIVE",
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || payload.error || "Failed to receive documents");
      }

      setReceiveSelectionItem(null);
      setSelectedTrackingNumbers((current) =>
        current.filter((trackingNumber) => !selectedTrackingNumbers.includes(trackingNumber))
      );
      setSuccessMessage(
        `${selectedTrackingNumbers.length} document${selectedTrackingNumbers.length === 1 ? "" : "s"} received successfully.`
      );
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to receive documents");
    } finally {
      setIsReceiving(false);
    }
  }

  async function transferSelectedDocuments() {
    if (selectedTrackingNumbers.length === 0 || !destinationOfficeId) return;

    setIsTransferring(true);
    setError("");
    setSuccessMessage("");
    try {
      const response = await fetch("/api/process/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingNumbers: selectedTrackingNumbers,
          action: "TRANSFER_TO_HOME",
          targetOfficeId: destinationOfficeId,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || payload.error || "Failed to transfer documents");
      }

      setSelectedTrackingNumbers([]);
      setDestinationOfficeId("");
      setSuccessMessage(
        `${selectedTrackingNumbers.length} document${selectedTrackingNumbers.length === 1 ? "" : "s"} transferred successfully.`
      );
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to transfer documents");
    } finally {
      setIsTransferring(false);
    }
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

            {/* Priority Filter */}
            <div className="w-full sm:w-48 shrink-0">
              <SearchableSelect
                options={priorityFilterOptions}
                value={priorityFilter}
                onChange={setPriorityFilter}
                placeholder="Filter by Priority"
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

      {successMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700">
          <CheckCircle2 size={18} />
          <p>{successMessage}</p>
        </div>
      )}

      {/* Bulk Operations Toolbar */}
      {items.length > 0 && (activeTab === "in_hand" || activeTab === "inbound") && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-blue-50/80 border border-blue-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
            <span>
              {activeTab === "in_hand"
                ? `Selected: ${selectedTrackingNumbers.length} documents`
                : `Selected: ${selectedTrackingNumbers.length} of ${items.length} documents`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeTab === "in_hand" && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Select Destination Office:</span>
                <select
                  value={destinationOfficeId}
                  onChange={(event) => setDestinationOfficeId(event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-xs focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select Office</option>
                  {destinationOffices.map((office) => (
                    <option key={office.id} value={office.id}>{office.officeName}</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shadow-sm"
                  disabled={selectedTrackingNumbers.length === 0 || !destinationOfficeId || isTransferring}
                  onClick={transferSelectedDocuments}
                >
                  <Send size={14} />
                  {isTransferring ? "Transferring..." : "Transfer"}
                </Button>
              </div>
            )}

            {activeTab === "inbound" && (
              <>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-sm"
                  disabled={selectedTrackingNumbers.length === 0 || isReceiving}
                  onClick={() => receiveSelectedDocuments(selectedTrackingNumbers)}
                >
                  <CheckCheck size={14} />
                  {isReceiving ? "Receiving..." : `Receive Selected (${selectedTrackingNumbers.length})`}
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
      ) : displayedItems.length === 0 ? (
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
                  {(activeTab === "in_hand" || activeTab === "inbound") && (
                    <th className="px-4 py-4 w-10">
                      <button type="button" onClick={handleSelectAll} className="text-slate-600">
                        {selectedTrackingNumbers.length === displayedItems.length && displayedItems.length > 0 ? (
                          <CheckSquare className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Square className="h-5 w-5 text-slate-400" />
                        )}
                      </button>
                    </th>
                  )}
                  <th className="px-4 py-4">SL No</th>

                  {activeTab === "in_hand" && (
                    <>
                      <th className="px-5 py-4">Tracking Number</th>
                      <th className="px-5 py-4">Registration Date</th>
                      <th className="px-5 py-4">Registration Office</th>
                      <th className="px-5 py-4">Document Name</th>
                      <th className="px-5 py-4">Document Type</th>
                      <th className="px-5 py-4">Delivery At</th>
                      <th className="px-5 py-4">Process Type</th>
                      <th className="px-5 py-4">Number of Days</th>
                      <th className="px-5 py-4">Total Amount</th>
                      <th className="px-5 py-4">Advance Amount</th>
                      <th className="px-5 py-4 text-right">Action</th>
                    </>
                  )}

                  {activeTab === "inbound" && (
                    <>
                      <th className="px-5 py-4">Bundle Number</th>
                      <th className="px-5 py-4">From</th>
                      <th className="px-5 py-4">Date Received</th>
                      <th className="px-5 py-4">Finished Days</th>
                      <th className="px-5 py-4 text-right">Action</th>
                    </>
                  )}

                  {(activeTab === "outbound" || activeTab === "bundle") && (
                    <>
                      <th className="px-5 py-4">Bundle Number</th>
                      <th className="px-5 py-4">From (Current Office)</th>
                      <th className="px-5 py-4">To (Destination Office)</th>
                      <th className="px-5 py-4">Date Sent</th>
                      <th className="px-5 py-4">Finished Days</th>
                      <th className="px-5 py-4 text-right">Action</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border) bg-white">
                {displayedItems.map((item: any, index: number) => {
                  const isSelected = selectedTrackingNumbers.includes(item.trackingNumber);
                  return (
                    <tr key={item.id} className={`transition ${isSelected ? "bg-blue-50/50" : "hover:bg-slate-50/70"}`}>
                      {(activeTab === "in_hand" || activeTab === "inbound") && (
                        <td className="px-4 py-4">
                          <button type="button" onClick={() => handleToggleSelect(item.trackingNumber)} className="text-slate-600">
                            {isSelected ? (
                              <CheckSquare className="h-5 w-5 text-blue-600" />
                            ) : (
                              <Square className="h-5 w-5 text-slate-400" />
                            )}
                          </button>
                        </td>
                      )}
                      <td className="px-4 py-4 font-semibold text-slate-500">{index + 1}</td>

                      {activeTab === "in_hand" && (
                        <>
                          <td className="px-5 py-4 font-bold text-blue-600">
                            <div className="flex items-center gap-2">
                              <PriorityDot priority={item.priority} size={10} />
                              <Link
                                href={`/dashboard/document-details/${encodeURIComponent(item.trackingNumber)}`}
                                className="hover:underline flex items-center gap-1.5 font-mono text-xs sm:text-sm"
                              >
                                {item.trackingNumber}
                              </Link>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-xs font-medium text-slate-700">
                            {formatDate(item.registrationDate || item.receivedDate || item.createdAt)}
                          </td>
                          <td className="px-5 py-4 text-xs font-semibold text-slate-800">
                            {item.registeredOffice || item.fromOfficeName || "Main"}
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-900 text-xs sm:text-sm">
                            {item.customerName || item.clientName || "-"}
                          </td>
                          <td className="px-5 py-4 text-xs font-medium text-slate-800">
                            {item.documentType || "-"}
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-600">
                            {item.deliveryLocation || "-"}
                          </td>
                          <td className="px-5 py-4 text-xs font-bold text-blue-800">
                            {item.mainProcess || item.processType || "-"}
                          </td>
                          <td className="px-5 py-4 text-xs font-bold text-amber-700">
                            {calculateNumberOfDays(item.currentStageEnteredAt)}
                          </td>
                          <td className="px-5 py-4 text-xs font-bold text-slate-900">
                            ₹{Number(item.totalAmount || item.totalCharges || 0).toFixed(2)}
                          </td>
                          <td className="px-5 py-4 text-xs font-bold text-emerald-700">
                            ₹{Number(item.advancePaid || 0).toFixed(2)}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="border-amber-200 text-amber-700 hover:bg-amber-50 text-xs px-2 py-1"
                                onClick={() => openBulkMovementModal("RETURN", item.trackingNumber, item.id)}
                              >
                                Return
                              </Button>
                            </div>
                          </td>
                        </>
                      )}

                      {activeTab === "inbound" && (
                        <>
                          <td
                            onClick={() => setPreviewItem(item)}
                            className="px-5 py-4 font-mono font-bold text-blue-600 hover:underline cursor-pointer"
                          >
                            {item.bundleNumber ? formatBundleNumber(item.bundleNumber) : item.trackingNumber}
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-800">
                            {item.registeredOffice || item.fromOfficeName || "Origin Office"}
                          </td>
                          <td className="px-5 py-4 text-xs font-medium text-slate-700">
                            {formatDate(item.receivedDate || item.createdAt)}
                          </td>
                          <td className="px-5 py-4 text-xs font-bold text-amber-700">
                            {calculateFinishedDays(item.receivedDate || item.createdAt)}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => openReceiveSelection(item)}
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
                            </div>
                          </td>
                        </>
                      )}

                      {(activeTab === "outbound" || activeTab === "bundle") && (
                        <>
                          <td className="px-5 py-4 font-mono font-bold text-blue-600">
                            {item.bundleNumber ? formatBundleNumber(item.bundleNumber) : item.trackingNumber}
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-800">
                            {item.fromOfficeName || "Current Office"}
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-800">
                            {item.toOfficeName || "Destination"}
                          </td>
                          <td className="px-5 py-4 text-xs font-medium text-slate-700">
                            {formatDate(item.sentDate || item.createdAt)}
                          </td>
                          <td className="px-5 py-4 text-xs font-bold text-amber-700">
                            {calculateFinishedDays(item.sentDate || item.createdAt)}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {item.status !== "Received" && item.status !== "COMPLETED" ? (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setRetrieveItem(item)}
                                  className="gap-1.5 text-xs text-blue-600 hover:bg-blue-50 border-blue-200"
                                >
                                  <RotateCcw size={14} /> Retrieve
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled
                                  title="Cannot retrieve because destination office has already received this document."
                                  className="gap-1.5 text-xs opacity-50 cursor-not-allowed"
                                >
                                  <RotateCcw size={14} /> Retrieve
                                </Button>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pre-Receive Bundle Information Preview Modal */}
      <BundlePreviewModal
        open={Boolean(previewItem)}
        onClose={() => setPreviewItem(null)}
        bundleData={previewItem}
      />

      {/* Receive Selection Modal */}
      <ReceiveSelectionModal
        open={Boolean(receiveSelectionItem)}
        onClose={() => setReceiveSelectionItem(null)}
        onConfirmReceive={receiveSelectedDocuments}
        bundleData={receiveSelectionItem}
        isReceiving={isReceiving}
      />

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
          selectedDocuments={items.filter((i) => modalTrackingNumbers.includes(i.trackingNumber))}
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
      {/* RETRIEVE CONFIRMATION MODAL */}
      <RetrieveConfirmationModal
        open={Boolean(retrieveItem)}
        onClose={() => setRetrieveItem(null)}
        itemTitle={retrieveItem?.trackingNumber}
        onConfirm={async (reason) => {
          if (!retrieveItem) return;
          const res = await fetch("/api/document-movement/retrieve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              trackingNumbers: [retrieveItem.trackingNumber],
              reason,
            }),
          });
          const json = await res.json();
          if (!res.ok) {
            alert(json.error || "Failed to retrieve document.");
            return;
          }
          alert(json.message || "Document retrieved successfully.");
          setRetrieveItem(null);
          await loadData();
        }}
      />
    </div>
  );
}
