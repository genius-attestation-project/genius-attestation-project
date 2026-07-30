"use client";

import { BadgeCheck, Eye, FileText, IndianRupee, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { Textarea } from "@/components/ui/Textarea";

type ApprovalAction = "Approved" | "Rejected" | "Returned";
type MainTabKey = "advance_payment" | "lob" | "inactive" | "overdue";

type Lead = any;
type LeadWorkflowApproval = any;
type AdvancePaymentApprovalItem = {
  id: string;
  registrationId: string;
  trackingNumber: string;
  registrationNumber: string;
  leadId: string;
  customerName: string;
  mobile: string;
  office: string;
  registeredBy: string;
  registeredDate: string;
  totalAmount: number;
  advanceAmount: number;
  remainingBalance: number;
  receiptFileId: string | null;
  receiptFileUrl: string | null;
  receiptFileName: string | null;
  status: string;
  approvalStatus: string;
  requestedBy: string;
  requestedDate: string;
  approvedBy: string | null;
  approvedDate: string | null;
  rejectedBy: string | null;
  rejectedDate: string | null;
  rejectionReason: string | null;
};

async function parseResponse<T>(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as T & { message?: string; error?: string };
  if (!response.ok) throw new Error(payload.error ?? payload.message ?? "Request failed.");
  return payload;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "Approved"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
      : status === "Rejected"
        ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
        : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300";

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${tone}`}>{status}</span>;
}

export function PendingApprovalDashboard() {
  const router = useRouter();

  const [advancePaymentRequests, setAdvancePaymentRequests] = useState<AdvancePaymentApprovalItem[]>([]);
  const [inactiveLeads, setInactiveLeads] = useState<Lead[]>([]);
  const [lobRequests, setLobRequests] = useState<LeadWorkflowApproval[]>([]);
  const [overdueFollowups, setOverdueFollowups] = useState<Lead[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [activeTab, setActiveTab] = useState<MainTabKey>("advance_payment");

  const [actionModal, setActionModal] = useState<{
    type: ApprovalAction;
    requestType: string;
    id: string;
    title: string;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [selectedReceipt, setSelectedReceipt] = useState<{ url: string | null; fileId: string | null; fileName: string | null } | null>(null);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [advanceRes, inactiveRes, lobRes, overdueRes] = await Promise.all([
        parseResponse<{ items: AdvancePaymentApprovalItem[] }>(await fetch("/api/advance-payment-approvals?status=Pending Approval")),
        parseResponse<{ items: Lead[] }>(await fetch("/api/workflow-approvals/inactive")),
        parseResponse<{ items: LeadWorkflowApproval[] }>(await fetch("/api/workflow-approvals/lob")),
        parseResponse<{ items: Lead[] }>(await fetch("/api/workflow-approvals/overdue")),
      ]);
      setAdvancePaymentRequests(advanceRes.items ?? []);
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
      if (actionModal.requestType === "ADVANCE_PAYMENT") {
        const endpoint =
          actionModal.type === "Approved"
            ? `/api/advance-payment-approvals/${actionModal.id}/approve`
            : `/api/advance-payment-approvals/${actionModal.id}/reject`;

        const body: Record<string, string> = {};
        if (actionModal.type === "Rejected") {
          if (!reason.trim()) {
            throw new Error("Rejection reason is required for rejecting an advance payment request.");
          }
          body.rejectionReason = reason.trim();
        } else if (reason.trim()) {
          body.remarks = reason.trim();
        }

        await parseResponse<{ success: boolean }>(
          await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
        );
      } else {
        await parseResponse<{ success: boolean }>(
          await fetch(`/api/workflow-approvals/action`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: actionModal.requestType,
              id: actionModal.id,
              action: actionModal.type,
              remarks: reason.trim(),
            }),
          }),
        );
      }

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

  const viewReceipt = (item: AdvancePaymentApprovalItem) => {
    if (item.receiptFileUrl) {
      window.open(item.receiptFileUrl, "_blank");
    } else if (item.receiptFileId) {
      window.open(`/api/registrations/files/${item.receiptFileId}`, "_blank");
    } else {
      setError("No uploaded receipt file found for this advance payment request.");
    }
  };

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <section className="overflow-hidden rounded-[32px] border border-blue-100 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_42%),linear-gradient(135deg,#ffffff,#dbeafe)] p-6 shadow-(--shadow-card) sm:p-8 dark:border-blue-900/40 dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.25),transparent_42%),linear-gradient(135deg,#0f172a,#1e293b)]">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Lead Management</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Pending Approval</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          Review supervisor approval requests for advance payments, restricted lead status changes, inactive leads, and overdue follow-ups.
        </p>
      </section>

      <section className="rounded-[28px] border border-(--border) bg-white/80 p-4 shadow-(--shadow-card) sm:p-5 dark:bg-white/5">
        <div className="flex flex-wrap gap-3">
          {[
            { key: "advance_payment" as const, label: "Advance Payment Approvals", count: advancePaymentRequests.length },
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
                    ? "border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none"
                    : "border-(--border) bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10",
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
        <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          {success}
        </p>
      )}

      {loading ? (
        <div className="rounded-[28px] border border-(--border) bg-white p-8 text-center text-sm text-soft shadow-(--shadow-card) dark:bg-white/5">
          Loading queues...
        </div>
      ) : (
        <div className="min-w-0 overflow-hidden rounded-[28px] border border-(--border) bg-white shadow-(--shadow-card) dark:bg-white/5">
          <div className="overflow-x-auto">
            {activeTab === "advance_payment" && (
              <table className="min-w-[1280px] text-left text-sm">
                <thead className="bg-blue-50 text-xs font-semibold uppercase tracking-[0.16em] text-soft dark:bg-white/5">
                  <tr>
                    <th className="px-5 py-4">Tracking / Reg No</th>
                    <th className="px-5 py-4">Lead ID</th>
                    <th className="px-5 py-4">Customer & Mobile</th>
                    <th className="px-5 py-4">Office</th>
                    <th className="px-5 py-4">Registered By & Date</th>
                    <th className="px-5 py-4">Amounts</th>
                    <th className="px-5 py-4">Receipt File</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Requested By</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border) bg-white dark:bg-transparent">
                  {advancePaymentRequests.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-soft">
                        No pending advance payment approval requests.
                      </td>
                    </tr>
                  ) : (
                    advancePaymentRequests.map((item) => (
                      <tr key={item.id} className="transition hover:bg-blue-50/70 dark:hover:bg-white/5">
                        <td className="px-5 py-4 font-bold text-blue-700 dark:text-blue-400">
                          {item.trackingNumber}
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                          {item.leadId}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900 dark:text-white">{item.customerName}</p>
                          <p className="text-xs text-soft">{item.mobile}</p>
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-700 dark:text-slate-300">
                          {item.office}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900 dark:text-white">{item.registeredBy}</p>
                          <p className="text-xs text-soft">
                            {new Date(item.registeredDate).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-emerald-600 dark:text-emerald-400">
                            Advance: {formatCurrency(item.advanceAmount)}
                          </p>
                          <p className="text-xs text-soft">
                            Total: {formatCurrency(item.totalAmount)} | Bal: {formatCurrency(item.remainingBalance)}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          {item.receiptFileUrl || item.receiptFileId ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => viewReceipt(item)}
                              className="gap-1.5"
                            >
                              <Eye size={14} /> View Receipt
                            </Button>
                          ) : (
                            <span className="text-xs text-soft">No File Uploaded</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900 dark:text-white">{item.requestedBy}</p>
                          <p className="text-xs text-soft">
                            {new Date(item.requestedDate).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() =>
                                setActionModal({
                                  type: "Approved",
                                  requestType: "ADVANCE_PAYMENT",
                                  id: item.id,
                                  title: `Approve Advance Payment (${item.trackingNumber})`,
                                })
                              }
                            >
                              Approve
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() =>
                                setActionModal({
                                  type: "Rejected",
                                  requestType: "ADVANCE_PAYMENT",
                                  id: item.id,
                                  title: `Reject Advance Payment (${item.trackingNumber})`,
                                })
                              }
                            >
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "lob" && (
              <table className="min-w-[1080px] text-left text-sm">
                <thead className="bg-blue-50 text-xs font-semibold uppercase tracking-[0.16em] text-soft dark:bg-white/5">
                  <tr>
                    <th className="px-5 py-4">Lead Name</th>
                    <th className="px-5 py-4">Requested By</th>
                    <th className="px-5 py-4">Request Date</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border) bg-white dark:bg-transparent">
                  {lobRequests.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-soft">No pending LOB requests</td></tr>
                  ) : (
                    lobRequests.map((item) => (
                      <tr key={item.id} className="transition hover:bg-blue-50/70 dark:hover:bg-white/5">
                        <td className="px-5 py-4 font-bold text-blue-700 dark:text-blue-400">{item.lead?.leadCode}</td>
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
                <thead className="bg-blue-50 text-xs font-semibold uppercase tracking-[0.16em] text-soft dark:bg-white/5">
                  <tr>
                    <th className="px-5 py-4">Lead Name</th>
                    <th className="px-5 py-4">Service</th>
                    <th className="px-5 py-4">Last Updated</th>
                    <th className="px-5 py-4">Assigned To</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border) bg-white dark:bg-transparent">
                  {inactiveLeads.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-soft">No inactive leads</td></tr>
                  ) : (
                    inactiveLeads.map((item) => (
                      <tr key={item.id} className="transition hover:bg-blue-50/70 dark:hover:bg-white/5">
                        <td className="px-5 py-4 font-bold text-blue-700 dark:text-blue-400">{item.leadCode}</td>
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
                <thead className="bg-blue-50 text-xs font-semibold uppercase tracking-[0.16em] text-soft dark:bg-white/5">
                  <tr>
                    <th className="px-5 py-4">Lead Name</th>
                    <th className="px-5 py-4">Due Date</th>
                    <th className="px-5 py-4">Assigned To</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border) bg-white dark:bg-transparent">
                  {overdueFollowups.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-soft">No overdue follow-ups</td></tr>
                  ) : (
                    overdueFollowups.map((item) => (
                      <tr key={item.id} className="transition hover:bg-blue-50/70 dark:hover:bg-white/5">
                        <td className="px-5 py-4 font-bold text-blue-700 dark:text-blue-400">{item.leadCode}</td>
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
        description={actionModal?.type === "Rejected" ? "Rejection reason is required." : "Provide remarks for this action."}
        placement="center"
      >
        {actionModal && (
          <div className="grid gap-4">
            <Textarea
              label={actionModal.type === "Rejected" ? "Rejection Reason *" : "Remarks"}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={actionModal.type === "Rejected" ? "Enter specific reason for rejecting advance payment..." : "Optional remarks..."}
              required={actionModal.type === "Rejected"}
            />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setActionModal(null)} disabled={submitting}>Cancel</Button>
              <Button
                variant={actionModal.type === "Rejected" ? "danger" : "primary"}
                onClick={() => void submitAction()}
                disabled={submitting || (actionModal.type === "Rejected" && !reason.trim())}
              >
                {submitting ? "Processing..." : "Submit Action"}
              </Button>
            </div>
          </div>
        )}
      </FormDrawer>
    </div>
  );
}
