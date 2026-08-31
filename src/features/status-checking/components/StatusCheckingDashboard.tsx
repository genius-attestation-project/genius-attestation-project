"use client";

import { Search, LoaderCircle, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

type AuditTrailItem = {
  id: string;
  action: string;
  description: string;
  performedBy: string | null;
  createdAt: string;
};

type StatusResult = {
  trackingNumber: string;
  customerName: string;
  service: string;
  sourceOffice: string;
  deliveryLocation: string;
  createdAt: string;
  trackingStatus: string;
  approvalStatus: string;
  bmStatus: string;
  paymentStatus: string;
  isBmLocked: boolean;
  auditTrail: AuditTrailItem[];
};

const timelineNodes = [
  { id: "registered", label: "Revenue Registration" },
  { id: "inbound", label: "Inbound" },
  { id: "outbound", label: "Outbound" },
  { id: "bm_processing", label: "BM Processing" },
  { id: "attestation", label: "Attestation Completed" },
  { id: "ready", label: "Ready for Delivery" },
  { id: "delivered", label: "Delivered" },
];

export function StatusCheckingDashboard() {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StatusResult | null>(null);
  const [error, setError] = useState("");

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!trackingNumber.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`/api/status-checking/${encodeURIComponent(trackingNumber.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch status.");
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  // Determine active nodes based on status mapping
  const getActiveNodes = (data: StatusResult) => {
    const active = new Set(["registered"]); // Always registered if found

    if (data.sourceOffice !== data.deliveryLocation) {
      // Cross-office
      if (data.bmStatus === "Accepted") {
        active.add("outbound");
        active.add("inbound");
        active.add("bm_processing");
      } else {
        active.add("outbound");
      }
    } else {
      // Same office
      if (data.bmStatus === "Accepted") {
        active.add("bm_processing");
      }
    }

    if (data.trackingStatus === "Attestation Completed" || data.trackingStatus === "Ready for Delivery" || data.trackingStatus === "Delivered") {
      active.add("attestation");
    }

    if (data.trackingStatus === "Ready for Delivery" || data.trackingStatus === "Delivered") {
      active.add("ready");
    }

    if (data.trackingStatus === "Delivered") {
      active.add("delivered");
    }

    return active;
  };

  const activeNodes = result ? getActiveNodes(result) : new Set();

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <section className="overflow-hidden rounded-[32px] border border-blue-100 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_42%),linear-gradient(135deg,_#ffffff,_#eff6ff)] p-6 shadow-(--shadow-card) sm:p-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Status Checking</p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">Document Lifecycle Tracker</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Enter a tracking number to view the complete lifecycle, current status, and history of a document.
            </p>
          </div>
          <form onSubmit={handleSearch} className="flex w-full md:w-auto items-center gap-2 rounded-2xl border border-blue-200 bg-white/90 p-2 shadow-sm">
            <input
              type="text"
              placeholder="Tracking Number..."
              className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-slate-400 font-medium"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              required
            />
            <Button type="submit" disabled={loading} className="shrink-0 px-4 py-2">
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </section>

      {error && (
        <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}

      {result && (
        <>
          <section className="rounded-[28px] border border-(--border) bg-white p-6 shadow-(--shadow-card)">
            <div className="mb-6 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Customer</p>
                <p className="mt-1 font-bold text-slate-900">{result.customerName}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Service</p>
                <p className="mt-1 font-bold text-slate-900">{result.service}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Origin → Destination</p>
                <p className="mt-1 font-bold text-slate-900">
                  {result.sourceOffice} → {result.deliveryLocation}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">BM Status</p>
                <p className="mt-1 font-bold text-slate-900">
                  {result.isBmLocked ? (
                    <span className="text-rose-600">Locked</span>
                  ) : (
                    result.bmStatus
                  )}
                </p>
              </div>
            </div>

            <div className="relative py-8">
              <div className="absolute top-12 left-0 h-1 w-full bg-slate-100 rounded"></div>
              <div className="relative flex justify-between">
                {timelineNodes.map((node) => {
                  const isActive = activeNodes.has(node.id);
                  return (
                    <div key={node.id} className="flex flex-col items-center text-center w-24">
                      <div
                        className={`z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                          isActive
                            ? "border-blue-500 bg-blue-500 text-white"
                            : "border-slate-300 bg-white text-slate-300"
                        }`}
                      >
                        {isActive ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                      </div>
                      <p
                        className={`mt-3 text-xs font-bold leading-tight ${
                          isActive ? "text-blue-700" : "text-slate-500"
                        }`}
                      >
                        {node.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-(--border) bg-white p-6 shadow-(--shadow-card)">
            <h3 className="mb-4 text-lg font-bold text-slate-900">Status History</h3>
            <div className="space-y-4">
              {result.auditTrail.length > 0 ? (
                result.auditTrail.map((log) => (
                  <div key={log.id} className="flex gap-4 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{log.action}</p>
                      <p className="text-sm text-slate-600">{log.description}</p>
                      <div className="mt-1 flex gap-3 text-xs font-semibold text-slate-400">
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                        <span>•</span>
                        <span>{log.performedBy || "System"}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={AlertCircle}
                  title="No history"
                  description="No audit trail events found for this registration."
                />
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
