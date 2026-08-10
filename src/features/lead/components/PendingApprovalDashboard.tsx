"use client";

import { BadgeCheck, Download, Eye, FileText, IndianRupee, ShieldCheck, Building2, CheckCircle2, Pencil, Trash2, XCircle, Search, RefreshCw, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDate, formatDateTime } from "@/utils/format";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { Textarea } from "@/components/ui/Textarea";
import { CorporateDetailFormModal } from "@/features/corporate-details/components/CorporateDetailFormModal";
import { AgreementCell } from "@/components/common/AgreementCell";
import { FileUpload } from "@/components/common/FileUpload";
import { useAuth } from "@/features/auth/hooks/useAuth";

type ApprovalAction = "Approved" | "Rejected" | "Returned";
type MainTabKey = "advance_payment" | "advance_details" | "corporate_approval" | "lob" | "inactive" | "overdue";

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
  paymentDate?: string | null;
  paymentMode?: string;
  referenceNumber?: string;
  collectedBy?: string;
  remarks?: string;
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
  const { user: currentUser } = useAuth();

  const canApprove =
    currentUser?.isSuperAdmin ||
    currentUser?.permissions?.includes("advance_payment_approval.approve") ||
    currentUser?.permissions?.includes("pending_approval.edit") ||
    currentUser?.permissions?.includes("pendingApproval.approve") ||
    currentUser?.permissions?.includes("*");

  const [advancePaymentRequests, setAdvancePaymentRequests] = useState<AdvancePaymentApprovalItem[]>([]);
  const [corporateApprovals, setCorporateApprovals] = useState<any[]>([]);
  const [inactiveLeads, setInactiveLeads] = useState<Lead[]>([]);
  const [lobRequests, setLobRequests] = useState<LeadWorkflowApproval[]>([]);
  const [overdueFollowups, setOverdueFollowups] = useState<Lead[]>([]);

  const [editingCorporate, setEditingCorporate] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [activeTab, setActiveTab] = useState<MainTabKey>("advance_payment");

  // Advance Details states
  const [advanceDetailsRecords, setAdvanceDetailsRecords] = useState<AdvancePaymentApprovalItem[]>([]);
  const [hasSearchedAdvanceDetails, setHasSearchedAdvanceDetails] = useState(false);
  const [loadingAdvanceDetails, setLoadingAdvanceDetails] = useState(false);
  const [officeLocations, setOfficeLocations] = useState<{ id: string; officeName: string }[]>([]);

  // Advance Details filters
  const [filterOffice, setFilterOffice] = useState("Select Office");
  const [filterFromDate, setFilterFromDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [filterToDate, setFilterToDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [filterStatus, setFilterStatus] = useState("Pending");

  // Advance Details Edit & Delete states
  const [editingDetailItem, setEditingDetailItem] = useState<AdvancePaymentApprovalItem | null>(null);
  const [editAmount, setEditAmount] = useState<number | string>("");
  const [editDate, setEditDate] = useState("");
  const [editMode, setEditMode] = useState("");
  const [editRemarks, setEditRemarks] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [deletingDetailItem, setDeletingDetailItem] = useState<AdvancePaymentApprovalItem | null>(null);

  // Dedicated Approve Modal state for Advance Payment Approval
  const [approveModalItem, setApproveModalItem] = useState<AdvancePaymentApprovalItem | null>(null);
  const [approveDate, setApproveDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [approveRemarks, setApproveRemarks] = useState("");
  const [approveProofFileId, setApproveProofFileId] = useState<string | null>(null);
  const [approveProofValidationError, setApproveProofValidationError] = useState("");

  // Generic action modal for Rejection / LOB / Inactive / Overdue
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
      const [advanceRes, corporateRes, inactiveRes, lobRes, overdueRes] = await Promise.all([
        parseResponse<{ items: AdvancePaymentApprovalItem[] }>(await fetch("/api/advance-payment-approvals?status=Pending Approval")),
        parseResponse<{ items: any[] }>(await fetch("/api/lead-approvals/corporate-details")),
        parseResponse<{ items: Lead[] }>(await fetch("/api/workflow-approvals/inactive")),
        parseResponse<{ items: LeadWorkflowApproval[] }>(await fetch("/api/workflow-approvals/lob")),
        parseResponse<{ items: Lead[] }>(await fetch("/api/workflow-approvals/overdue")),
      ]);
      setAdvancePaymentRequests(advanceRes.items ?? []);
      setCorporateApprovals(corporateRes.items ?? []);
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

    async function fetchOffices() {
      try {
        const res = await fetch("/api/office-locations", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setOfficeLocations(data.officeLocations || []);
        }
      } catch (err) {
        console.error("Failed to fetch office locations:", err);
      }
    }
    void fetchOffices();
  }, []);

  // Handler to submit generic action (Rejection / LOB / Corporate etc.)
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
        const endpoint = `/api/advance-payment-approvals/${actionModal.id}/reject`;

        if (!reason.trim()) {
          throw new Error("Rejection reason is required for rejecting an advance payment request.");
        }

        await parseResponse<{ success: boolean }>(
          await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rejectionReason: reason.trim() }),
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
        await fetchAdvanceDetails();
      }
    } catch (err: any) {
      setError(err.message || "Failed to process action.");
    } finally {
      setSubmitting(false);
    }
  }

  // Dedicated Approve Submission Handler
  async function handleApproveSubmit() {
    if (!approveModalItem) return;

    const effectiveProofId = approveProofFileId || approveModalItem.receiptFileId;
    if (!effectiveProofId) {
      setApproveProofValidationError("Bank Proof is required before approving the advance payment.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");
    setApproveProofValidationError("");

    try {
      await parseResponse<{ success: boolean }>(
        await fetch(`/api/advance-payment-approvals/${approveModalItem.id}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            receiptFileId: effectiveProofId,
            approvalDate: approveDate,
            remarks: approveRemarks.trim(),
          }),
        })
      );

      setSuccess(`Advance payment for ${approveModalItem.trackingNumber} approved successfully.`);
      setApproveModalItem(null);
      setApproveProofFileId(null);
      setApproveRemarks("");
      await loadData();
      if (hasSearchedAdvanceDetails) {
        await fetchAdvanceDetails();
      }
    } catch (err: any) {
      setError(err.message || "Failed to approve advance payment.");
    } finally {
      setSubmitting(false);
    }
  }

  // Advance Details Filter Search Handler
  async function fetchAdvanceDetails() {
    setLoadingAdvanceDetails(true);
    setError("");
    try {
      const queryParams = new URLSearchParams();
      if (filterOffice && filterOffice !== "Select Office" && filterOffice !== "All") {
        queryParams.set("office", filterOffice);
      }
      if (filterFromDate) {
        queryParams.set("fromDate", filterFromDate);
      }
      if (filterToDate) {
        queryParams.set("toDate", filterToDate);
      }
      if (filterStatus && filterStatus !== "All") {
        queryParams.set("status", filterStatus === "Pending" ? "Pending Approval" : filterStatus);
      }

      const res = await parseResponse<{ items: AdvancePaymentApprovalItem[] }>(
        await fetch(`/api/advance-payment-approvals?${queryParams.toString()}`)
      );
      setAdvanceDetailsRecords(res.items || []);
      setHasSearchedAdvanceDetails(true);
    } catch (err: any) {
      setError(err.message || "Failed to fetch advance details.");
    } finally {
      setLoadingAdvanceDetails(false);
    }
  }

  function handleResetAdvanceDetails() {
    setFilterOffice("Select Office");
    setFilterFromDate(new Date().toISOString().split("T")[0]);
    setFilterToDate(new Date().toISOString().split("T")[0]);
    setFilterStatus("Pending");
    setAdvanceDetailsRecords([]);
    setHasSearchedAdvanceDetails(false);
  }

  // Detail Record Edit Handler
  function startEditingDetail(item: AdvancePaymentApprovalItem) {
    setEditingDetailItem(item);
    setEditAmount(item.advanceAmount);
    setEditDate(item.paymentDate ? item.paymentDate.split("T")[0] : new Date().toISOString().split("T")[0]);
    setEditMode(item.paymentMode || "Cash");
    setEditRemarks(item.remarks || "");
    setEditStatus(item.status || "Pending Approval");
  }

  async function handleUpdateDetail() {
    if (!editingDetailItem) return;
    setSubmitting(true);
    setError("");
    try {
      await parseResponse(
        await fetch(`/api/advance-payment-approvals/${editingDetailItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            advanceAmount: Number(editAmount),
            paymentDate: editDate,
            paymentMode: editMode,
            remarks: editRemarks,
            status: editStatus,
          }),
        })
      );
      setSuccess(`Record for ${editingDetailItem.trackingNumber} updated successfully.`);
      setEditingDetailItem(null);
      await fetchAdvanceDetails();
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to update record.");
    } finally {
      setSubmitting(false);
    }
  }

  // Detail Record Delete Handler
  async function handleDeleteDetail() {
    if (!deletingDetailItem) return;
    setSubmitting(true);
    setError("");
    try {
      await parseResponse(
        await fetch(`/api/advance-payment-approvals/${deletingDetailItem.id}`, {
          method: "DELETE",
        })
      );
      setSuccess(`Record for ${deletingDetailItem.trackingNumber} deleted successfully.`);
      setDeletingDetailItem(null);
      await fetchAdvanceDetails();
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to delete record.");
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

  const openApproveModal = (item: AdvancePaymentApprovalItem) => {
    setApproveModalItem(item);
    setApproveDate(new Date().toISOString().split("T")[0]);
    setApproveRemarks(item.remarks || "");
    setApproveProofFileId(item.receiptFileId || null);
    setApproveProofValidationError("");
  };

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <section className="overflow-hidden rounded-4xl border border-blue-100 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_42%),linear-gradient(135deg,#ffffff,#dbeafe)] p-6 shadow-(--shadow-card) sm:p-8 dark:border-blue-900/40 dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.25),transparent_42%),linear-gradient(135deg,#0f172a,#1e293b)]">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">Lead & Financial Approvals</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Pending Approval</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          Review enterprise approval requests for advance payment approvals, corporate details, restricted lead status changes, and follow-ups.
        </p>
      </section>

      <section className="rounded-[28px] border border-(--border) bg-white/80 p-4 shadow-(--shadow-card) sm:p-5 dark:bg-white/5">
        <div className="flex flex-wrap gap-3">
          {[
            { key: "advance_payment" as const, label: "Advance Payment Approvals", count: advancePaymentRequests.length },
            { key: "advance_details" as const, label: "Advance Details", count: hasSearchedAdvanceDetails ? advanceDetailsRecords.length : 0 },
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
                <span className={`mt-1 block text-xs ${active ? "text-blue-50" : "text-soft"}`}>
                  {tab.key === "advance_details" && !hasSearchedAdvanceDetails ? "Filter to view" : `${tab.count} items`}
                </span>
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
          {/* TAB 1: Advance Payment Approvals */}
          {activeTab === "advance_payment" && (
            <div className="overflow-x-auto">
              <table className="min-w-345 text-left text-sm">
                <thead className="bg-blue-50 text-xs font-semibold uppercase tracking-[0.16em] text-soft dark:bg-white/5">
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
                          <p className="font-bold text-slate-900 dark:text-white">{item.customerName}</p>
                          <p className="text-xs text-soft">{item.mobile}</p>
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-700 dark:text-slate-300">
                          {item.documentName || "-"}
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
                          <p className="font-bold text-slate-900 dark:text-white">{item.paymentMode || "Cash"}</p>
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
                          <p className="font-bold text-slate-900 dark:text-white">{item.requestedBy}</p>
                          <p className="text-soft">{formatDate(item.requestedDate)}</p>
                        </td>
                        <td className="px-5 py-4">
                          {canApprove ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => openApproveModal(item)}
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
            </div>
          )}

          {/* TAB 2: Advance Details */}
          {activeTab === "advance_details" && (
            <div className="p-4 sm:p-6 grid gap-6">
              {/* Filter Section */}
              <div className="rounded-2xl border border-blue-200/60 bg-blue-50/40 p-4 sm:p-5 dark:border-blue-900/40 dark:bg-white/5">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Advance Details</h2>
                <div className="flex flex-wrap items-end gap-4">
                  {/* Office Filter */}
                  <div className="flex-1 min-w-[180px]">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                      Office
                    </label>
                    <select
                      value={filterOffice}
                      onChange={(e) => setFilterOffice(e.target.value)}
                      className="w-full rounded-xl border border-blue-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    >
                      <option value="Select Office">Select Office</option>
                      <option value="All">All Offices</option>
                      {officeLocations.map((loc) => (
                        <option key={loc.id} value={loc.officeName}>
                          {loc.officeName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* From Date Filter */}
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                      From
                    </label>
                    <input
                      type="date"
                      value={filterFromDate}
                      onChange={(e) => setFilterFromDate(e.target.value)}
                      className="w-full rounded-xl border border-blue-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>

                  {/* To Date Filter */}
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                      To
                    </label>
                    <input
                      type="date"
                      value={filterToDate}
                      onChange={(e) => setFilterToDate(e.target.value)}
                      className="w-full rounded-xl border border-blue-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>

                  {/* Status Filter */}
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                      Status
                    </label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full rounded-xl border border-blue-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                      <option value="All">All</option>
                    </select>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 min-w-[200px]">
                    <Button
                      onClick={() => void fetchAdvanceDetails()}
                      disabled={loadingAdvanceDetails}
                      className="flex-1 font-bold gap-1.5 uppercase text-xs tracking-wider"
                    >
                      <Search size={14} /> SEARCH
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleResetAdvanceDetails}
                      disabled={loadingAdvanceDetails}
                      className="flex-1 font-bold gap-1.5 uppercase text-xs tracking-wider border-blue-300 text-blue-700 dark:text-blue-300"
                    >
                      <RefreshCw size={14} /> RESET
                    </Button>
                  </div>
                </div>
              </div>

              {/* Advance Details Content */}
              {!hasSearchedAdvanceDetails ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center text-slate-500 dark:border-slate-800 dark:bg-white/5 dark:text-slate-400">
                  <p className="text-sm font-semibold">No advance details found. Apply filters to view records.</p>
                </div>
              ) : loadingAdvanceDetails ? (
                <div className="rounded-2xl border border-(--border) bg-white p-8 text-center text-sm text-soft dark:bg-white/5">
                  Searching advance payment details...
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-(--border)">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-blue-50 text-xs font-semibold uppercase tracking-[0.16em] text-soft dark:bg-white/5">
                      <tr>
                        <th className="px-4 py-3.5">SL No</th>
                        <th className="px-4 py-3.5">Tracking Number</th>
                        <th className="px-4 py-3.5">Customer Name</th>
                        <th className="px-4 py-3.5">Office</th>
                        <th className="px-4 py-3.5">Advance Amount</th>
                        <th className="px-4 py-3.5">Payment Date</th>
                        <th className="px-4 py-3.5">Payment Mode</th>
                        <th className="px-4 py-3.5">Status</th>
                        <th className="px-4 py-3.5">Created By</th>
                        <th className="px-4 py-3.5">Remarks</th>
                        <th className="px-4 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-(--border) bg-white dark:bg-transparent">
                      {advanceDetailsRecords.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="p-8 text-center text-soft font-medium">
                            No advance payment records match the selected filters.
                          </td>
                        </tr>
                      ) : (
                        advanceDetailsRecords.map((item, index) => {
                          const isEditing = editingDetailItem?.id === item.id;
                          return (
                            <tr key={item.id} className="transition hover:bg-blue-50/50 dark:hover:bg-white/5">
                              <td className="px-4 py-3 font-semibold text-slate-500">{index + 1}</td>
                              <td className="px-4 py-3 font-extrabold font-mono text-blue-700 dark:text-blue-400">
                                {item.trackingNumber}
                              </td>
                              <td className="px-4 py-3">
                                <p className="font-bold text-slate-900 dark:text-white">{item.customerName}</p>
                                <p className="text-xs text-soft">{item.mobile}</p>
                              </td>
                              <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                                {item.office || "-"}
                              </td>
                              <td className="px-4 py-3">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={editAmount}
                                    onChange={(e) => setEditAmount(e.target.value)}
                                    className="w-24 rounded-lg border border-blue-300 p-1.5 text-xs font-bold focus:outline-none"
                                  />
                                ) : (
                                  <p className="font-extrabold text-blue-700 dark:text-blue-300">
                                    {formatCurrency(item.advanceAmount)}
                                  </p>
                                )}
                              </td>
                              <td className="px-4 py-3 text-xs">
                                {isEditing ? (
                                  <input
                                    type="date"
                                    value={editDate}
                                    onChange={(e) => setEditDate(e.target.value)}
                                    className="w-32 rounded-lg border border-blue-300 p-1.5 text-xs font-medium focus:outline-none"
                                  />
                                ) : (
                                  formatDate(item.paymentDate)
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {isEditing ? (
                                  <select
                                    value={editMode}
                                    onChange={(e) => setEditMode(e.target.value)}
                                    className="rounded-lg border border-blue-300 p-1.5 text-xs font-semibold focus:outline-none"
                                  >
                                    <option value="Cash">Cash</option>
                                    <option value="UPI">UPI</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Cheque">Cheque</option>
                                    <option value="Card">Card</option>
                                  </select>
                                ) : (
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {item.paymentMode || "Cash"}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {isEditing ? (
                                  <select
                                    value={editStatus}
                                    onChange={(e) => setEditStatus(e.target.value)}
                                    className="rounded-lg border border-blue-300 p-1.5 text-xs font-semibold focus:outline-none"
                                  >
                                    <option value="Pending Approval">Pending Approval</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Rejected">Rejected</option>
                                  </select>
                                ) : (
                                  <StatusBadge status={item.status} />
                                )}
                              </td>
                              <td className="px-4 py-3 text-xs font-medium text-slate-700 dark:text-slate-300">
                                {item.requestedBy}
                              </td>
                              <td className="px-4 py-3 text-xs max-w-xs truncate">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editRemarks}
                                    onChange={(e) => setEditRemarks(e.target.value)}
                                    className="w-full rounded-lg border border-blue-300 p-1.5 text-xs focus:outline-none"
                                  />
                                ) : (
                                  item.remarks || "-"
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {isEditing ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button
                                      size="sm"
                                      onClick={() => void handleUpdateDetail()}
                                      disabled={submitting}
                                      className="text-xs py-1 px-2.5"
                                    >
                                      Update
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setEditingDetailItem(null)}
                                      disabled={submitting}
                                      className="text-xs py-1 px-2.5"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => startEditingDetail(item)}
                                      className="text-xs py-1 px-2.5"
                                    >
                                      <Pencil size={13} className="mr-1" /> Edit
                                    </Button>
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      onClick={() => setDeletingDetailItem(item)}
                                      className="text-xs py-1 px-2.5"
                                    >
                                      <Trash2 size={13} className="mr-1" /> Delete
                                    </Button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Corporate Details Approval */}
          {activeTab === "corporate_approval" && (
            <div className="overflow-x-auto">
              <table className="min-w-7xl text-left text-sm">
                <thead className="bg-blue-50 text-xs font-semibold uppercase tracking-[0.16em] text-soft dark:bg-white/5">
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
                          {item.companyName}
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                          {item.contactPersonName}
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
                          <p className="font-semibold text-slate-900 dark:text-white">{item.createdBy || "System User"}</p>
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
            </div>
          )}

          {/* TAB 4: LOB Requests */}
          {activeTab === "lob" && (
            <div className="overflow-x-auto">
              <table className="min-w-270 text-left text-sm">
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
            </div>
          )}

          {/* TAB 5: Inactive Leads */}
          {activeTab === "inactive" && (
            <div className="overflow-x-auto">
              <table className="min-w-270 text-left text-sm">
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
                        <td className="px-5 py-4 text-rose-600 font-semibold">{formatDate(item.updatedAt)}</td>
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
            </div>
          )}

          {/* TAB 6: Overdue Follow-ups */}
          {activeTab === "overdue" && (
            <div className="overflow-x-auto">
              <table className="min-w-270 text-left text-sm">
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
                        <td className="px-5 py-4 text-rose-600 font-semibold">{formatDate(item.nextFollowupAt)}</td>
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
            </div>
          )}
        </div>
      )}

      {/* DEDICATED ADVANCE PAYMENT APPROVAL POPUP */}
      <FormDrawer
        open={Boolean(approveModalItem)}
        onClose={() => { if (!submitting) setApproveModalItem(null); }}
        title={`Approve Advance Payment (${approveModalItem?.trackingNumber || ""})`}
        description="Please review and upload bank/payment proof before approving."
        placement="center"
      >
        {approveModalItem && (
          <div className="grid gap-5">
            {/* Field 1: Bank Proof (File Upload) */}
            <div className="grid gap-1.5">
              <FileUpload
                label="Bank Proof"
                moduleName="ADVANCE_PAYMENT"
                fileCategory="ADVANCE_PAYMENT"
                required
                existingFile={
                  approveModalItem.receiptFileId
                    ? {
                        id: approveModalItem.receiptFileId,
                        fileName: approveModalItem.receiptFileName || "Bank Proof",
                        url: approveModalItem.receiptFileUrl || undefined,
                      }
                    : undefined
                }
                onUploadComplete={(fileId) => {
                  setApproveProofFileId(fileId);
                  setApproveProofValidationError("");
                }}
                onRemove={() => {
                  setApproveProofFileId(null);
                }}
              />
              {approveProofValidationError && (
                <p className="flex items-center gap-1 text-xs font-semibold text-rose-600 mt-1">
                  <AlertCircle size={14} /> {approveProofValidationError}
                </p>
              )}
            </div>

            {/* Field 2: Date */}
            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Approval Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={approveDate}
                onChange={(e) => setApproveDate(e.target.value)}
                className="w-full rounded-2xl border border-(--border) bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none dark:bg-white/5 dark:text-white"
                required
              />
            </div>

            {/* Field 3: Remarks */}
            <Textarea
              label="Remarks"
              value={approveRemarks}
              onChange={(e) => setApproveRemarks(e.target.value)}
              placeholder="Enter optional approval notes or comments..."
            />

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setApproveModalItem(null)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleApproveSubmit()}
                disabled={submitting}
              >
                {submitting ? "Approving..." : "Approve"}
              </Button>
            </div>
          </div>
        )}
      </FormDrawer>

      {/* GENERIC ACTION MODAL (For Rejections, LOB, Inactive, Overdue) */}
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
              placeholder={actionModal.type === "Rejected" ? "Enter specific reason for rejection..." : "Optional remarks..."}
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

      {/* DELETE CONFIRMATION MODAL FOR ADVANCE DETAILS */}
      <FormDrawer
        open={Boolean(deletingDetailItem)}
        onClose={() => { if (!submitting) setDeletingDetailItem(null); }}
        title="Delete Advance Record"
        description="Are you sure you want to delete this advance record?"
        placement="center"
      >
        {deletingDetailItem && (
          <div className="grid gap-4">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
              <p className="font-bold">Tracking Number: {deletingDetailItem.trackingNumber}</p>
              <p className="mt-1">Customer: {deletingDetailItem.customerName}</p>
              <p className="mt-1">Amount: {formatCurrency(deletingDetailItem.advanceAmount)}</p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeletingDetailItem(null)} disabled={submitting}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => void handleDeleteDetail()} disabled={submitting}>
                {submitting ? "Deleting..." : "Delete Record"}
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
