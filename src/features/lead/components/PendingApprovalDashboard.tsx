"use client";

import { BadgeCheck, CircleX, ClipboardList, Eye, LockKeyhole, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { StatsCard } from "@/components/ui/StatsCard";
import { Textarea } from "@/components/ui/Textarea";

type ApprovalAction = "Approved" | "Rejected" | "Returned";
type MainTabKey = "inactive" | "lob" | "overdue";

type Lead = any;
type LeadWorkflowApproval = any;

async function parseResponse<T>(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as T & { message?: string, error?: string };
  if (!response.ok) throw new Error(payload.error ?? payload.message ?? "Request failed.");
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

export function PendingApprovalDashboard() {
  const router = useRouter();
  
  const [inactiveLeads, setInactiveLeads] = useState<Lead[]>([]);
  const [lobRequests, setLobRequests] = useState<LeadWorkflowApproval[]>([]);
  const [overdueFollowups, setOverdueFollowups] = useState<Lead[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [activeTab, setActiveTab] = useState<MainTabKey>("lob");
  
  const [actionModal, setActionModal] = useState<{ type: ApprovalAction; requestType: string, id: string, title: string } | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [inactiveRes, lobRes, overdueRes] = await Promise.all([
        parseResponse<{ items: Lead[] }>(await fetch("/api/workflow-approvals/inactive")),
        parseResponse<{ items: LeadWorkflowApproval[] }>(await fetch("/api/workflow-approvals/lob")),
        parseResponse<{ items: Lead[] }>(await fetch("/api/workflow-approvals/overdue")),
      ]);
      setInactiveLeads(inactiveRes.items ?? []);
      setLobRequests(lobRes.items ?? []);
      setOverdueFollowups(overdueRes.items ?? []);
    } catch (err: any) {
      setError(err.message || "Failed to load approval queues.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function submitAction() {
    if (!actionModal) return;
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = await parseResponse<{ success: boolean }>(
        await fetch(`/api/workflow-approvals/action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: actionModal.requestType,
            id: actionModal.id,
            action: actionModal.type,
            remarks: reason.trim(),
          }),
        })
      );
      setSuccess("Action applied successfully.");
      setActionModal(null);
      setReason("");
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to process action.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <section className="overflow-hidden rounded-[32px] border border-blue-100 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_42%),linear-gradient(135deg,#ffffff,#dbeafe)] p-6 shadow-(--shadow-card) sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Lead Management</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">Pending Approval</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Review supervisor approval requests for restricted lead status changes, inactive leads, and overdue follow-ups.
        </p>
      </section>

      <section className="rounded-[28px] border border-(--border) bg-white/80 p-4 shadow-(--shadow-card) sm:p-5">
        <div className="flex flex-wrap gap-3">
          {[
            { key: "lob" as const, label: "LOB Requests", count: lobRequests.length },
            { key: "inactive" as const, label: "Inactive Leads", count: inactiveLeads.length },
            { key: "overdue" as const, label: "Overdue Follow-ups", count: overdueFollowups.length },
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

      {error && (
        <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700">
          {success}
        </p>
      )}

      {loading ? (
        <div className="rounded-[28px] border border-(--border) bg-white p-8 text-center text-sm text-soft shadow-(--shadow-card)">
          Loading queues...
        </div>
      ) : (
        <div className="min-w-0 overflow-hidden rounded-[28px] border border-(--border) bg-white shadow-(--shadow-card)">
          <div className="overflow-x-auto">
            {activeTab === "lob" && (
              <table className="min-w-[1080px] text-left text-sm">
                <thead className="bg-blue-50 text-xs font-semibold uppercase tracking-[0.16em] text-soft">
                  <tr>
                    <th className="px-5 py-4">Lead Name</th>
                    <th className="px-5 py-4">Requested By</th>
                    <th className="px-5 py-4">Request Date</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border) bg-white">
                  {lobRequests.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-soft">No pending LOB requests</td></tr>
                  ) : (
                    lobRequests.map((item) => (
                      <tr key={item.id} className="transition hover:bg-blue-50/70">
                        <td className="px-5 py-4 font-bold text-blue-700">{item.lead?.leadCode}</td>
                        <td className="px-5 py-4">{item.requestedBy}</td>
                        <td className="px-5 py-4">{new Date(item.requestedAt).toLocaleDateString()}</td>
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => setActionModal({ type: "Approved", requestType: "LOB_REQUEST", id: item.id, title: "Approve LOB Request" })}>Approve</Button>
                            <Button variant="danger" size="sm" onClick={() => setActionModal({ type: "Rejected", requestType: "LOB_REQUEST", id: item.id, title: "Reject LOB Request" })}>Reject</Button>
                            <Button variant="ghost" size="sm" onClick={() => setActionModal({ type: "Returned", requestType: "LOB_REQUEST", id: item.id, title: "Return LOB Request" })}>Return</Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "inactive" && (
              <table className="min-w-[1080px] text-left text-sm">
                <thead className="bg-blue-50 text-xs font-semibold uppercase tracking-[0.16em] text-soft">
                  <tr>
                    <th className="px-5 py-4">Lead Name</th>
                    <th className="px-5 py-4">Service</th>
                    <th className="px-5 py-4">Last Updated</th>
                    <th className="px-5 py-4">Assigned To</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border) bg-white">
                  {inactiveLeads.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-soft">No inactive leads</td></tr>
                  ) : (
                    inactiveLeads.map((item) => (
                      <tr key={item.id} className="transition hover:bg-blue-50/70">
                        <td className="px-5 py-4 font-bold text-blue-700">{item.leadCode}</td>
                        <td className="px-5 py-4">{item.service}</td>
                        <td className="px-5 py-4 text-rose-600 font-semibold">{new Date(item.updatedAt).toLocaleDateString()}</td>
                        <td className="px-5 py-4">{item.assignedUser || "Unassigned"}</td>
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => setActionModal({ type: "Approved", requestType: "INACTIVE_LEAD", id: item.id, title: "Move Inactive Lead to LOB" })}>Move to LOB</Button>
                            <Button variant="ghost" size="sm" onClick={() => setActionModal({ type: "Returned", requestType: "INACTIVE_LEAD", id: item.id, title: "Return to User" })}>Return to User</Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "overdue" && (
              <table className="min-w-[1080px] text-left text-sm">
                <thead className="bg-blue-50 text-xs font-semibold uppercase tracking-[0.16em] text-soft">
                  <tr>
                    <th className="px-5 py-4">Lead Name</th>
                    <th className="px-5 py-4">Due Date</th>
                    <th className="px-5 py-4">Assigned To</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border) bg-white">
                  {overdueFollowups.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-soft">No overdue follow-ups</td></tr>
                  ) : (
                    overdueFollowups.map((item) => (
                      <tr key={item.id} className="transition hover:bg-blue-50/70">
                        <td className="px-5 py-4 font-bold text-blue-700">{item.leadCode}</td>
                        <td className="px-5 py-4 text-rose-600 font-semibold">{new Date(item.nextFollowupAt).toLocaleDateString()}</td>
                        <td className="px-5 py-4">{item.assignedUser || "Unassigned"}</td>
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => setActionModal({ type: "Approved", requestType: "OVERDUE_FOLLOWUP", id: item.id, title: "Unlock Follow-up" })}>Unlock</Button>
                            <Button variant="ghost" size="sm" onClick={() => setActionModal({ type: "Returned", requestType: "OVERDUE_FOLLOWUP", id: item.id, title: "Return to User" })}>Return to User</Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <FormDrawer
        open={Boolean(actionModal)}
        onClose={() => { if (!submitting) setActionModal(null); }}
        title={actionModal?.title || "Action"}
        description="Provide remarks for this action."
        placement="center"
      >
        {actionModal && (
          <div className="grid gap-4">
            <Textarea
              label="Remarks"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional remarks..."
            />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setActionModal(null)} disabled={submitting}>Cancel</Button>
              <Button onClick={() => void submitAction()} disabled={submitting}>
                {submitting ? "Processing..." : "Submit"}
              </Button>
            </div>
          </div>
        )}
      </FormDrawer>
    </div>
  );
}
