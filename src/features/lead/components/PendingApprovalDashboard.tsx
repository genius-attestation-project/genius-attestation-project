"use client";

import React, { useEffect, useState } from "react";
import {
  BadgeCheck,
  Building2,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  IndianRupee,
  Pencil,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDate, formatDateTime, formatTitleCase } from "@/utils/format";

import { Button } from "@/components/ui/Button";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { CorporateDetailFormModal } from "@/features/corporate-details/components/CorporateDetailFormModal";
import { AgreementCell } from "@/components/common/AgreementCell";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AdvanceApprovalModal } from "@/features/revenue/components/AdvanceApprovalModal";
import { EditAdvanceModal } from "@/features/revenue/components/EditAdvanceModal";

type ApprovalAction = "Approved" | "Rejected" | "Returned";
type MainTabKey =
  | "advance_payment"
  | "advance_details"
  | "corporate_approval"
  | "lob"
  | "inactive"
  | "overdue";

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
  documentName?: string;
  office: string;
  registeredBy: string;
  registeredDate: string;
  totalAmount: number;
  advanceAmount: number;
  remainingBalance: number;
  currentAdvancePaid?: number;
  currentBalance?: number;
  paymentMode?: string;
  referenceNumber?: string;
  collectedBy?: string;
  remarks?: string;
  approvalRemarks?: string;
  receiptFileId: string | null;
  receiptFileUrl: string | null;
  receiptFileName: string | null;
  bankProofFileId?: string | null;
  bankProofFileUrl?: string | null;
  bankProofFileName?: string | null;
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
  const formatted = formatTitleCase(status);
  const tone =
    formatted === "Approved"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
      : formatted === "Rejected"
        ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
        : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300";

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${tone}`}>{formatted}</span>;
}

export function PendingApprovalDashboard() {
  const router = useRouter();
  const { user: currentUser } = useAuth();

  const canApprove =
    currentUser?.isSuperAdmin ||
    currentUser?.permissions?.includes("advance_payment_approval.approve") ||
    currentUser?.permissions?.includes("pending_approval.edit") ||
    currentUser?.permissions?.includes("pendingApproval.approve") ||
    currentUser?.permissions?.includes("*");

  const [advancePaymentRequests, setAdvancePaymentRequests] = useState<AdvancePaymentApprovalItem[]>([]);
  const [allAdvanceRecords, setAllAdvanceRecords] = useState<AdvancePaymentApprovalItem[]>([]);
  const [hasSearchedAdvanceDetails, setHasSearchedAdvanceDetails] = useState(false);

  const [corporateApprovals, setCorporateApprovals] = useState<any[]>([]);
  const [inactiveLeads, setInactiveLeads] = useState<Lead[]>([]);
  const [lobRequests, setLobRequests] = useState<LeadWorkflowApproval[]>([]);
  const [overdueFollowups, setOverdueFollowups] = useState<Lead[]>([]);
  const [officesList, setOfficesList] = useState<{ id: string; officeName: string }[]>([]);

  // Advance Details filters
  const [filterOffice, setFilterOffice] = useState("");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("pending");

  const [editingCorporate, setEditingCorporate] = useState<any>(null);
  const [approvingAdvance, setApprovingAdvance] = useState<AdvancePaymentApprovalItem | null>(null);
  const [editingAdvance, setEditingAdvance] = useState<AdvancePaymentApprovalItem | null>(null);
  const [deletingAdvance, setDeletingAdvance] = useState<AdvancePaymentApprovalItem | null>(null);

  const [loading, setLoading] = useState(true);
  const [advanceDetailsLoading, setAdvanceDetailsLoading] = useState(false);
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

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [advanceRes, corporateRes, inactiveRes, lobRes, overdueRes, officesRes] = await Promise.all([
        parseResponse<{ items: AdvancePaymentApprovalItem[] }>(await fetch("/api/advance-payment-approvals?status=Pending Approval", { cache: "no-store" })),
        parseResponse<{ items: any[] }>(await fetch("/api/lead-approvals/corporate-details", { cache: "no-store" })),
        parseResponse<{ items: Lead[] }>(await fetch("/api/workflow-approvals/inactive", { cache: "no-store" })),
        parseResponse<{ items: LeadWorkflowApproval[] }>(await fetch("/api/workflow-approvals/lob", { cache: "no-store" })),
        parseResponse<{ items: Lead[] }>(await fetch("/api/workflow-approvals/overdue", { cache: "no-store" })),
        fetch("/api/offices/all", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ offices: [] })),
      ]);
      setAdvancePaymentRequests(advanceRes.items ?? []);
      setCorporateApprovals(corporateRes.items ?? []);
      setInactiveLeads(inactiveRes.items ?? []);
      setLobRequests(lobRes.items ?? []);
      setOverdueFollowups(overdueRes.items ?? []);
      setOfficesList(officesRes.offices ?? officesRes.data ?? []);
    } catch (err: any) {
      setError(err.message || "Failed to load approval queues.");
    } finally {
      setLoading(false);
    }
  }

  async function loadAdvanceDetails(office: string, fromDate: string, toDate: string, status: string) {
    setAdvanceDetailsLoading(true);
    try {
      const params = new URLSearchParams();
      if (office && office !== "Select Office") params.set("office", office);
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);
      if (status && status !== "All") {
        if (status === "pending" || status === "Pending") {
          params.set("status", "Pending Approval");
        } else {
          params.set("status", status);
        }
      }

      const res = await parseResponse<{ items: AdvancePaymentApprovalItem[] }>(
        await fetch(`/api/advance-payment-approvals?${params.toString()}`, { cache: "no-store" }),
      );
      setAllAdvanceRecords(res.items ?? []);
    } catch (err: any) {
      console.error("Failed to load advance details:", err);
    } finally {
      setAdvanceDetailsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const handleSearchAdvanceDetails = async () => {
    setHasSearchedAdvanceDetails(true);
    await loadAdvanceDetails(filterOffice, filterFromDate, filterToDate, filterStatus);
  };

  const handleResetAdvanceDetailsFilters = () => {
    setFilterOffice("");
    setFilterFromDate("");
    setFilterToDate("");
    setFilterStatus("pending");
    setHasSearchedAdvanceDetails(false);
    setAllAdvanceRecords([]);
  };

  async function submitAction() {
    if (!actionModal) return;
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      if (actionModal.requestType === "CORPORATE_DETAILS") {
        const action = actionModal.type === "Approved" ? "approve" : "reject";
        await parseResponse(
          await fetch(`/api/lead-approvals/corporate-details/${actionModal.id}/action`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action,
              rejectionReason: reason.trim(),
            }),
          })
        );
      } else if (actionModal.requestType === "ADVANCE_PAYMENT") {
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
      if (hasSearchedAdvanceDetails) {
        await loadAdvanceDetails(filterOffice, filterFromDate, filterToDate, filterStatus);
      }
    } catch (err: any) {
      setError(err.message || "Failed to process action.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteAdvance() {
    if (!deletingAdvance) return;
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await parseResponse(
        await fetch(`/api/advance-payment-approvals/${deletingAdvance.id}`, {
          method: "DELETE",
        }),
      );
      setSuccess(`Advance payment record #${deletingAdvance.trackingNumber} deleted successfully.`);
      setDeletingAdvance(null);
      await loadData();
      if (hasSearchedAdvanceDetails) {
        await loadAdvanceDetails(filterOffice, filterFromDate, filterToDate, filterStatus);
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete advance payment.");
    } finally {
      setSubmitting(false);
    }
  }

  const viewReceipt = (item: AdvancePaymentApprovalItem) => {
    if (item.receiptFileUrl) {
      window.open(item.receiptFileUrl, "_blank");
    } else if (item.receiptFileId) {
      window.open(`/api/files/${item.receiptFileId}/view`, "_blank");
    } else {
      setError("No uploaded proof file found for this advance payment request.");
    }
  };

  const viewBankProof = (item: AdvancePaymentApprovalItem) => {
    if (item.bankProofFileUrl) {
      window.open(item.bankProofFileUrl, "_blank");
    } else if (item.bankProofFileId) {
      window.open(`/api/files/${item.bankProofFileId}/view`, "_blank");
    } else {
      setError("No Bank Proof file available for this approved advance payment.");
    }
  };

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <section className="overflow-hidden rounded-4xl border border-blue-100 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_42%),linear-gradient(135deg,#ffffff,#dbeafe)] p-6 shadow-(--shadow-card) sm:p-8 dark:border-blue-900/40 dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.25),transparent_42%),linear-gradient(135deg,#0f172a,#1e293b)]">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Lead & Financial Approvals</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Pending Approval</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          Review enterprise approval requests for advance payment approvals, advance details management, corporate details, restricted lead status changes, and follow-ups.
        </p>
      </section>

      <section className="rounded-[28px] border border-(--border) bg-white/80 p-4 shadow-(--shadow-card) sm:p-5 dark:bg-white/5">
        <div className="flex flex-wrap gap-3">
          {[
            { key: "advance_payment" as const, label: "Advance Payment Approvals", count: advancePaymentRequests.length },
            { key: "advance_details" as const, label: "Advance Details", count: hasSearchedAdvanceDetails ? allAdvanceRecords.length : 0 },
            { key: "corporate_approval" as const, label: "Corporate Details Approval", count: corporateApprovals.length },
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
          Loading approval queues...
        </div>
      ) : (
        <div className="min-w-0 overflow-hidden rounded-[28px] border border-(--border) bg-white shadow-(--shadow-card) dark:bg-white/5">
          <div className="overflow-x-auto">
            {activeTab === "advance_payment" && (
              <table className="min-w-345 text-left text-sm">
                <thead className="bg-blue-50 text-xs font-semibold tracking-wider text-soft dark:bg-white/5">
                  <tr>
                    <th className="px-5 py-4">Tracking Number</th>
                    <th className="px-5 py-4">Customer Name</th>
                    <th className="px-5 py-4">Document</th>
                    <th className="px-5 py-4">Current Status</th>
                    <th className="px-5 py-4">Requested Advance</th>
                    <th className="px-5 py-4">Payment Mode & Ref</th>
                    <th className="px-5 py-4">Uploaded Proof</th>
                    <th className="px-5 py-4">Remarks</th>
                    <th className="px-5 py-4">Requested By & Date</th>
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
                        <td className="px-5 py-4 font-extrabold font-mono text-blue-700 dark:text-blue-400">
                          {item.trackingNumber}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900 dark:text-white">{formatTitleCase(item.customerName)}</p>
                          <p className="text-xs text-soft">{item.mobile}</p>
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-700 dark:text-slate-300">
                          {item.documentName ? formatTitleCase(item.documentName) : "-"}
                        </td>
                        <td className="px-5 py-4 text-xs">
                          <p className="font-bold text-emerald-700 dark:text-emerald-300">
                            Approved: {formatCurrency(item.currentAdvancePaid ?? 0)}
                          </p>
                          <p className="text-slate-500 dark:text-slate-400">
                            Balance: {formatCurrency(item.currentBalance ?? (item.totalAmount - (item.currentAdvancePaid ?? 0)))}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-extrabold text-blue-700 dark:text-blue-300 text-base">
                            {formatCurrency(item.advanceAmount)}
                          </p>
                          <p className="text-[11px] text-soft">Total: {formatCurrency(item.totalAmount)}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900 dark:text-white">{formatTitleCase(item.paymentMode || "Cash")}</p>
                          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                            Ref: {item.referenceNumber || "-"}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          {item.receiptFileUrl || item.receiptFileId ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => viewReceipt(item)}
                              className="gap-1.5 font-bold text-xs"
                            >
                              <Eye size={14} /> View Proof
                            </Button>
                          ) : (
                            <span className="text-xs text-soft italic">No Proof Uploaded</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-300 max-w-xs truncate">
                          {item.remarks || "-"}
                        </td>
                        <td className="px-5 py-4 text-xs">
                          <p className="font-bold text-slate-900 dark:text-white">{formatTitleCase(item.requestedBy)}</p>
                          <p className="text-soft">{formatDate(item.requestedDate)}</p>
                        </td>
                        <td className="px-5 py-4">
                          {canApprove ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => setApprovingAdvance(item)}
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
                          ) : (
                            <span className="text-xs italic text-slate-400" title="Approval permission required">
                              Approval Permission Required
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* Advance Details View */}
            {activeTab === "advance_details" && (
              <div className="p-5 space-y-4">
                {/* Filter Controls Bar */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
                  <h2 className="text-base font-bold text-slate-800 dark:text-white mb-4">Advance Details</h2>
                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    {/* Office */}
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">Office</span>
                      <select
                        className="h-9 min-w-44 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-slate-800 dark:text-white"
                        value={filterOffice}
                        onChange={(e) => setFilterOffice(e.target.value)}
                      >
                        <option value="">Select Office</option>
                        {officesList.map((off) => (
                          <option key={off.id} value={off.officeName}>
                            {off.officeName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* From Date */}
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">From</span>
                      <Input
                        label=""
                        type="date"
                        className="h-9 text-xs"
                        value={filterFromDate}
                        onChange={(e) => setFilterFromDate(e.target.value)}
                      />
                    </div>

                    {/* To Date */}
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">To</span>
                      <Input
                        label=""
                        type="date"
                        className="h-9 text-xs"
                        value={filterToDate}
                        onChange={(e) => setFilterToDate(e.target.value)}
                      />
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2">
                      <select
                        className="h-9 min-w-32 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-slate-800 dark:text-white"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                      >
                        <option value="All">All Statuses</option>
                        <option value="pending">Pending Approval</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>

                    {/* Buttons */}
                    <div className="flex items-center gap-2 ml-auto">
                      <Button
                        size="sm"
                        onClick={() => void handleSearchAdvanceDetails()}
                        className="h-9 px-5 font-bold text-xs"
                      >
                        Search
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleResetAdvanceDetailsFilters}
                        className="h-9 px-5 font-bold text-xs"
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Advance Details Data Table (Office Column Removed) */}
                <div className="overflow-x-auto rounded-2xl border border-(--border) bg-white shadow-sm dark:bg-white/5">
                  <table className="min-w-310 text-left text-sm">
                    <thead className="bg-blue-50 text-xs font-semibold tracking-wider text-soft dark:bg-white/5">
                      <tr>
                        <th className="px-5 py-4">Tracking Number</th>
                        <th className="px-5 py-4">Customer Name</th>
                        <th className="px-5 py-4">Advance Amount</th>
                        <th className="px-5 py-4">Payment Mode</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4">Created Date</th>
                        <th className="px-5 py-4">Approved Date</th>
                        <th className="px-5 py-4">Approved By</th>
                        <th className="px-5 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-(--border) bg-white dark:bg-transparent">
                      {advanceDetailsLoading ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-soft">
                            Loading advance details...
                          </td>
                        </tr>
                      ) : !hasSearchedAdvanceDetails ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-soft font-medium">
                            No records found. Please select Office and filters to search advance details.
                          </td>
                        </tr>
                      ) : allAdvanceRecords.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-soft font-medium">
                            No advance payment records match the selected filters.
                          </td>
                        </tr>
                      ) : (
                        allAdvanceRecords.map((item) => {
                          const isApproved = item.status === "Approved";

                          return (
                            <tr key={item.id} className="transition hover:bg-blue-50/70 dark:hover:bg-white/5">
                              <td className="px-5 py-4 font-extrabold font-mono text-blue-700 dark:text-blue-400">
                                {item.trackingNumber}
                              </td>
                              <td className="px-5 py-4">
                                <p className="font-bold text-slate-900 dark:text-white">{formatTitleCase(item.customerName)}</p>
                                <p className="text-xs text-soft">{item.mobile}</p>
                              </td>
                              <td className="px-5 py-4 font-extrabold text-blue-700 dark:text-blue-300 text-base">
                                {formatCurrency(item.advanceAmount)}
                              </td>
                              <td className="px-5 py-4">
                                <p className="font-bold text-slate-900 dark:text-white">{formatTitleCase(item.paymentMode || "Cash")}</p>
                                {item.referenceNumber && item.referenceNumber !== "-" && (
                                  <p className="text-xs font-mono text-slate-500">Ref: {item.referenceNumber}</p>
                                )}
                              </td>
                              <td className="px-5 py-4">
                                <StatusBadge status={item.status} />
                              </td>
                              <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-300">
                                {formatDate(item.requestedDate)}
                              </td>
                              <td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-300">
                                {isApproved && item.approvedDate ? formatDate(item.approvedDate) : ""}
                              </td>
                              <td className="px-5 py-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                {isApproved ? formatTitleCase(item.approvedBy) || "" : ""}
                              </td>
                              <td className="px-5 py-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Eye icon: ONLY for Approved records, opening Bank Proof */}
                                  {isApproved && (
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => viewBankProof(item)}
                                      title="View Bank Proof"
                                      className="p-1.5 text-xs text-slate-700 border-slate-200 dark:text-slate-200"
                                    >
                                      <Eye size={14} />
                                    </Button>
                                  )}
                                  {/* Edit button: ONLY for Approved records */}
                                  {isApproved && (
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => setEditingAdvance(item)}
                                      title="Edit Advance Payment"
                                      className="p-1.5 text-xs"
                                    >
                                      <Pencil size={14} />
                                    </Button>
                                  )}
                                  {/* Delete button: Visible for Pending Approval, Rejected, and Approved */}
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() => setDeletingAdvance(item)}
                                    title="Delete Advance Payment"
                                    className="p-1.5 text-xs"
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "corporate_approval" && (
              <table className="min-w-7xl text-left text-sm">
                <thead className="bg-blue-50 text-xs font-semibold tracking-wider text-soft dark:bg-white/5">
                  <tr>
                    <th className="px-5 py-4">Company Name</th>
                    <th className="px-5 py-4">Contact Person</th>
                    <th className="px-5 py-4">Mobile / Email</th>
                    <th className="px-5 py-4">Address</th>
                    <th className="px-5 py-4">Agreement</th>
                    <th className="px-5 py-4">Created By & Date</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border) bg-white dark:bg-transparent">
                  {corporateApprovals.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-soft">
                        No pending corporate details approval requests.
                      </td>
                    </tr>
                  ) : (
                    corporateApprovals.map((item) => (
                      <tr key={item.id} className="transition hover:bg-blue-50/70 dark:hover:bg-white/5">
                        <td className="px-5 py-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-blue-600 shrink-0" />
                          {formatTitleCase(item.companyName)}
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                          {formatTitleCase(item.contactPersonName)}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900 dark:text-white">{item.contactPersonMobile}</p>
                          {item.email && <p className="text-xs text-soft">{item.email}</p>}
                        </td>
                        <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                          {item.address || "-"}
                        </td>
                        <td className="px-5 py-4">
                          <AgreementCell file={item.agreementFile} />
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900 dark:text-white">{formatTitleCase(item.createdBy || "System User")}</p>
                          <p className="text-xs text-soft">{formatDate(item.createdAt)}</p>
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={item.approvalStatus} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setEditingCorporate(item)}
                              title="Edit Info"
                            >
                              <Pencil size={14} className="mr-1" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              onClick={() =>
                                setActionModal({
                                  type: "Approved",
                                  requestType: "CORPORATE_DETAILS",
                                  id: item.id,
                                  title: `Approve Corporate Details (${item.companyName})`,
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
                                  requestType: "CORPORATE_DETAILS",
                                  id: item.id,
                                  title: `Reject Corporate Details (${item.companyName})`,
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
              <table className="min-w-270 text-left text-sm">
                <thead className="bg-blue-50 text-xs font-semibold tracking-wider text-soft dark:bg-white/5">
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
                        <td className="px-5 py-4">{formatTitleCase(item.requestedBy)}</td>
                        <td className="px-5 py-4">{formatDate(item.requestedAt)}</td>
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
              <table className="min-w-270 text-left text-sm">
                <thead className="bg-blue-50 text-xs font-semibold tracking-wider text-soft dark:bg-white/5">
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
                        <td className="px-5 py-4">{formatTitleCase(item.service)}</td>
                        <td className="px-5 py-4 text-rose-600 font-semibold">{formatDate(item.updatedAt)}</td>
                        <td className="px-5 py-4">{formatTitleCase(item.assignedUser || "Unassigned")}</td>
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
              <table className="min-w-270 text-left text-sm">
                <thead className="bg-blue-50 text-xs font-semibold tracking-wider text-soft dark:bg-white/5">
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
                        <td className="px-5 py-4 text-rose-600 font-semibold">{formatDate(item.nextFollowupAt)}</td>
                        <td className="px-5 py-4">{formatTitleCase(item.assignedUser || "Unassigned")}</td>
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

      {/* Approve Advance Payment Modal */}
      <AdvanceApprovalModal
        open={Boolean(approvingAdvance)}
        onClose={() => setApprovingAdvance(null)}
        onSuccess={async () => {
          await loadData();
          if (hasSearchedAdvanceDetails) {
            await loadAdvanceDetails(filterOffice, filterFromDate, filterToDate, filterStatus);
          }
        }}
        item={approvingAdvance}
      />

      {/* Edit Advance Payment Modal */}
      <EditAdvanceModal
        open={Boolean(editingAdvance)}
        onClose={() => setEditingAdvance(null)}
        onSuccess={async () => {
          await loadData();
          if (hasSearchedAdvanceDetails) {
            await loadAdvanceDetails(filterOffice, filterFromDate, filterToDate, filterStatus);
          }
        }}
        item={editingAdvance}
      />

      {/* Delete Confirmation Modal */}
      {deletingAdvance && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setDeletingAdvance(null);
          }}
        >
          <div className="relative flex flex-col w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900 space-y-4">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Delete Advance Payment</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to delete the advance payment of{" "}
              <span className="font-extrabold text-rose-600 dark:text-rose-400">
                ₹{deletingAdvance.advanceAmount.toLocaleString()}
              </span>{" "}
              for tracking number <span className="font-mono font-bold">{deletingAdvance.trackingNumber}</span>?
              This action will recalculate financial balances and remove ledger entries.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setDeletingAdvance(null)} disabled={submitting}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => void handleDeleteAdvance()} disabled={submitting}>
                {submitting ? "Deleting..." : "Delete Record"}
              </Button>
            </div>
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

      <CorporateDetailFormModal
        open={Boolean(editingCorporate)}
        onClose={() => setEditingCorporate(null)}
        onSuccess={() => void loadData()}
        initialData={editingCorporate}
        title="Edit Pending Corporate Details"
        description="Update corporate details before approving or rejecting."
      />
    </div>
  );
}
