"use client";

import { useEffect, useState } from "react";
import { CheckCheck, FileText, LoaderCircle, PackageCheck } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatsCard } from "@/components/ui/StatsCard";
import { ProcessItem, ProcessStats } from "../types/process.types";
import { MovementModal } from "./MovementModal";
import { ProcessHistoryTimeline } from "./ProcessHistoryTimeline";
import { LiveTimelineModal } from "@/features/registration/components/LiveTimelineModal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { services } from "@/features/lead/data/lead.data";

const emptyStats: ProcessStats = {
  inbound: 0,
  inHand: 0,
  completed: 0,
  rejected: 0,
  outbound: 0,
  total: 0,
};

export function ProcessDashboard() {
  const [processType, setProcessType] = useState<string>("All"); // Filter
  
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

  const availableProcessTypes = [
    { label: "All", value: "All" },
    ...Array.from(new Set(services.filter((s) => s.trim() !== "")))
      .sort((a, b) => a.localeCompare(b))
      .map(service => ({ label: service, value: service }))
  ];

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const typeQuery = processType === "All" ? "" : `?processType=${encodeURIComponent(processType)}`;
      const res = await fetch(`/api/process${typeQuery}`, { cache: "no-store" });
      const payload = await res.json();
      
      if (!res.ok) {
        throw new Error(payload.message || "Failed to load");
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
  }, [processType]);

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
    { label: "Total Documents", value: stats.total.toLocaleString(), delta: "All", description: "In process module", icon: FileText, tone: "slate" as const },
    { label: "In Hand", value: stats.inHand.toLocaleString(), delta: "Live", description: "Currently working", icon: LoaderCircle, tone: "blue" as const },
  ];

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <section className="relative rounded-4xl border border-blue-100 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_42%),linear-gradient(135deg,#ffffff,#eff6ff)] p-6 shadow-(--shadow-card) sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Process Module</p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">Document Processing</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Manage attestation workflows, track status, and coordinate with the delivery office.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 z-10 w-full sm:w-72">
            <label className="text-xs font-semibold uppercase text-slate-500">Filter by Process</label>
            <SearchableSelect
              options={availableProcessTypes}
              value={processType}
              onChange={setProcessType}
              placeholder="Select a Process Type"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => <StatsCard key={card.label} {...card} />)}
      </section>

      {error && (
        <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}

      {loading ? (
        <div className="rounded-[28px] border border-(--border) bg-white p-8 text-center text-sm text-soft shadow-(--shadow-card)">
          Loading processes...
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title={`No documents in hand`}
          description="There are currently no documents to process."
        />
      ) : (
        <div className="min-w-0 overflow-hidden rounded-[28px] border border-(--border) bg-white shadow-(--shadow-card)">
          <div className="overflow-x-auto">
            <table className="w-full min-w-255 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.16em] text-soft">
                <tr>
                  <th className="px-5 py-4">Tracking Number</th>
                  <th className="px-5 py-4">Client Name</th>
                  <th className="px-5 py-4">Process Type</th>
                  <th className="px-5 py-4">Received Date</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border) bg-white">
                {items.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-50/70">
                    <td className="px-5 py-4 font-bold text-blue-700">
                      <button onClick={() => openTimeline(item.trackingNumber)} className="hover:underline">
                        {item.trackingNumber}
                      </button>
                    </td>
                    <td className="px-5 py-4">{item.clientName}</td>
                    <td className="px-5 py-4 font-medium">{item.processType}</td>
                    <td className="px-5 py-4">{item.receivedDate}</td>
                    <td className="px-5 py-4 text-right space-x-2">
                      <Button size="sm" variant="secondary" className="text-rose-600 border-rose-200" onClick={() => openMovementModal(item.id, "REJECTED")}>Reject</Button>
                      <Button size="sm" variant="secondary" onClick={() => openMovementModal(item.id, "SEND_TO_OFFICE")}>Send To Office</Button>
                      <Button size="sm" onClick={() => openMovementModal(item.id, "COMPLETED")}>Complete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {movementModalOpen && selectedAssignmentId && (
        <MovementModal
          open={movementModalOpen}
          onClose={() => setMovementModalOpen(false)}
          title={`Process Document`}
          description="Please confirm the action you want to take on this document."
          action={targetAction}
          assignmentId={selectedAssignmentId}
          onSuccess={loadData}
        />
      )}

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
