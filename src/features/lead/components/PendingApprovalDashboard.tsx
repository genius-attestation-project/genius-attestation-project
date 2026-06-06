"use client";

import { BadgeCheck, CircleX, ClipboardList, Eye, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { StatsCard } from "@/components/ui/StatsCard";
import { Textarea } from "@/components/ui/Textarea";
import type {
  LeadApprovalHistoryResponse,
  LeadApprovalItem,
} from "@/features/lead/types/lead-approval.types";

type ApprovalAction = "approve" | "reject";
type TabKey = "pending" | "approved" | "rejected";

async function parseResponse<T>(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as T & { message?: string };

  if (!response.ok) {
    throw new Error(payload.message ?? "Request failed.");
  }

  return payload;
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "Approved"
      ? "bg-emerald-50 text-emerald-700"
      : status === "Rejected"
        ? "bg-rose-50 text-rose-700"
        : "bg-amber-50 text-amber-700";

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{status}</span>;
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-(--border) bg-white/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-soft">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

export function PendingApprovalDashboard() {
  const [pending, setPending] = useState<LeadApprovalItem[]>([]);
  const [approved, setApproved] = useState<LeadApprovalItem[]>([]);
  const [rejected, setRejected] = useState<LeadApprovalItem[]>([]);
  const [stats, setStats] = useState<LeadApprovalHistoryResponse["stats"]>({
    pendingApprovals: 0,
    approvedToday: 0,
    rejectedToday: 0,
    totalRequests: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [selected, setSelected] = useState<LeadApprovalItem | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [actionModal, setActionModal] = useState<{ type: ApprovalAction; item: LeadApprovalItem } | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadApprovalData() {
    setLoading(true);
    setError("");

    try {
      const [pendingResponse, historyResponse] = await Promise.all([
        parseResponse<{ items: LeadApprovalItem[] }>(await fetch("/api/lead-approvals/pending", { cache: "no-store" })),
        parseResponse<LeadApprovalHistoryResponse>(await fetch("/api/lead-approvals/history", { cache: "no-store" })),
      ]);

      setPending(pendingResponse.items ?? []);
      setApproved(historyResponse.approved ?? []);
      setRejected(historyResponse.rejected ?? []);
      setStats(historyResponse.stats);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load approvals.");
      setPending([]);
      setApproved([]);
      setRejected([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadApprovalData();
  }, []);

  const cards = useMemo(
    () => [
      {
        label: "Pending Approvals",
        value: stats.pendingApprovals.toLocaleString(),
        delta: "Queue",
        description: "Requests currently waiting for your action",
        icon: ClipboardList,
        tone: "amber" as const,
      },
      {
        label: "Approved Today",
        value: stats.approvedToday.toLocaleString(),
        delta: "Today",
        description: "Requests approved during the current day",
        icon: BadgeCheck,
        tone: "blue" as const,
      },
      {
        label: "Rejected Today",
        value: stats.rejectedToday.toLocaleString(),
        delta: "Today",
        description: "Requests rejected during the current day",
        icon: CircleX,
        tone: "slate" as const,
      },
      {
        label: "Total Requests",
        value: stats.totalRequests.toLocaleString(),
        delta: "All",
        description: "All approval requests routed to you",
        icon: ShieldCheck,
        tone: "blue" as const,
      },
    ],
    [stats],
  );

  const activeItems =
    activeTab === "approved" ? approved : activeTab === "rejected" ? rejected : pending;

  async function submitAction() {
    if (!actionModal || !reason.trim()) {
      setError(actionModal?.type === "approve" ? "Approval description is required." : "Rejection reason is required.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const endpoint =
        actionModal.type === "approve"
          ? `/api/lead-approvals/${actionModal.item.id}/approve`
          : `/api/lead-approvals/${actionModal.item.id}/reject`;

      const payload = await parseResponse<{ message: string }>(
        await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reason.trim() }),
        }),
      );

      setSuccess(payload.message);
      setActionModal(null);
      setReason("");
      await loadApprovalData();
      setActiveTab(actionModal.type === "approve" ? "approved" : "rejected");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to process request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <section className="overflow-hidden rounded-[32px] border border-blue-100 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_42%),linear-gradient(135deg,_#ffffff,_#dbeafe)] p-6 shadow-(--shadow-card) sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Lead Management</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">Pending Approval</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Review supervisor approval requests for restricted lead status changes, keep an audit trail, and release only validated transitions into the live pipeline.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatsCard key={card.label} {...card} />
        ))}
      </section>

      <section className="rounded-[28px] border border-(--border) bg-white/80 p-4 shadow-(--shadow-card) sm:p-5">
        <div className="flex flex-wrap gap-3">
          {[
            { key: "pending" as const, label: "Pending Requests", count: pending.length },
            { key: "approved" as const, label: "Approved Requests", count: approved.length },
            { key: "rejected" as const, label: "Rejected Requests", count: rejected.length },
          ].map((tab) => {
            const active = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={[
                  "rounded-2xl border px-4 py-3 text-left transition",
                  active
                    ? "border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-200"
                    : "border-(--border) bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50",
                ].join(" ")}
              >
                <span className="block text-sm font-bold">{tab.label}</span>
                <span className={`mt-1 block text-xs ${active ? "text-blue-50" : "text-soft"}`}>{tab.count} items</span>
              </button>
            );
          })}
        </div>
      </section>

      {error ? (
        <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700">
          {success}
        </p>
      ) : null}

      {loading ? (
        <div className="rounded-[28px] border border-(--border) bg-white p-8 text-center text-sm text-soft shadow-(--shadow-card)">
          Loading approval queue...
        </div>
      ) : activeItems.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={`No ${activeTab} requests`}
          description="Approval requests will appear here automatically based on your supervisor queue and history."
        />
      ) : (
        <div className="min-w-0 overflow-hidden rounded-[28px] border border-(--border) bg-white shadow-(--shadow-card)">
          <div className="overflow-x-auto">
            <table className="min-w-[1080px] text-left text-sm">
              <thead className="bg-blue-50 text-xs font-semibold uppercase tracking-[0.16em] text-soft">
                <tr>
                  <th className="px-5 py-4">Lead Name</th>
                  <th className="px-5 py-4">Mobile</th>
                  <th className="px-5 py-4">Service</th>
                  <th className="px-5 py-4">Current Status</th>
                  <th className="px-5 py-4">Requested Status</th>
                  <th className="px-5 py-4">Requested By</th>
                  <th className="px-5 py-4">Request Date</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border) bg-white">
                {activeItems.map((item) => (
                  <tr key={item.id} className="transition hover:bg-blue-50/70">
                    <td className="px-5 py-4 font-bold text-blue-700">{item.leadName}</td>
                    <td className="px-5 py-4">{item.mobile}</td>
                    <td className="px-5 py-4">{item.service}</td>
                    <td className="px-5 py-4">{item.currentStatus}</td>
                    <td className="px-5 py-4">{item.requestedStatus}</td>
                    <td className="px-5 py-4">{item.requestedBy}</td>
                    <td className="px-5 py-4">{item.requestDate}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={item.approvalStatus} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setSelected(item); setDetailsOpen(true); }}>
                          <Eye size={15} /> View Details
                        </Button>
                        {item.approvalStatus === "Pending" ? (
                          <>
                            <Button size="sm" onClick={() => { setActionModal({ type: "approve", item }); setReason(""); }}>
                              Approve
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => { setActionModal({ type: "reject", item }); setReason(""); }}>
                              Reject
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <FormDrawer
        open={detailsOpen && Boolean(selected)}
        onClose={() => setDetailsOpen(false)}
        title="Approval details"
        description="Customer, lead, and approval request context for the selected supervisor action."
      >
        {selected ? (
          <div className="grid gap-4 md:grid-cols-2">
            <DetailBlock label="Customer Information" value={`${selected.leadName} | ${selected.mobile}`} />
            <DetailBlock label="Lead Information" value={`${selected.leadCode} | ${selected.service}`} />
            <DetailBlock label="Current Status" value={selected.currentStatus} />
            <DetailBlock label="Requested Status" value={selected.requestedStatus} />
            <DetailBlock label="Requested By" value={selected.requestedBy} />
            <DetailBlock label="Request Date" value={selected.requestDate} />
            <DetailBlock label="Assigned User" value={selected.assignedUser} />
            <DetailBlock label="Approval Status" value={selected.approvalStatus} />
            <DetailBlock label="Approval Notes" value={selected.approvalReason ?? selected.rejectionReason ?? "-"} />
            <DetailBlock label="Lead Notes" value={selected.remark} />
            <DetailBlock label="Email" value={selected.email} />
            <DetailBlock label="Country" value={selected.country} />
          </div>
        ) : null}
      </FormDrawer>

      <FormDrawer
        open={Boolean(actionModal)}
        onClose={() => { if (!submitting) setActionModal(null); }}
        title={actionModal?.type === "approve" ? "Approve request" : "Reject request"}
        description={
          actionModal?.type === "approve"
            ? "Provide the approval description that justifies moving this lead forward."
            : "Provide the rejection reason so the requester can correct and resubmit."
        }
        placement="center"
      >
        {actionModal ? (
          <div className="grid gap-4">
            <Textarea
              label={actionModal.type === "approve" ? "Approval Description" : "Rejection Reason"}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={
                actionModal.type === "approve"
                  ? "Customer submitted all required documents and payment confirmed."
                  : "Customer documents incomplete."
              }
            />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setActionModal(null)} disabled={submitting}>
                Cancel
              </Button>
              <Button
                variant={actionModal.type === "approve" ? "primary" : "danger"}
                onClick={() => void submitAction()}
                disabled={submitting}
              >
                {submitting
                  ? actionModal.type === "approve"
                    ? "Approving..."
                    : "Rejecting..."
                  : actionModal.type === "approve"
                    ? "Approve"
                    : "Reject"}
              </Button>
            </div>
          </div>
        ) : null}
      </FormDrawer>
    </div>
  );
}
