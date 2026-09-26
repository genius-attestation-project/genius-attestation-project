"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
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
import Link from "next/link";
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
import { EditRequestDiffModal } from "@/features/registration/components/EditRequestDiffModal";
import { RejectEditRequestModal } from "@/features/registration/components/RejectEditRequestModal";
import type { RegistrationEditRequestItem } from "@/features/registration/types/registration-edit-request.types";
import { AccountApprovalDiffModal } from "@/features/account-approval/components/AccountApprovalDiffModal";
import { AccountApprovalRejectModal } from "@/features/account-approval/components/AccountApprovalRejectModal";
import type { AccountApprovalItem } from "@/features/account-approval/types/account-approval.types";

type ApprovalAction = "Approved" | "Rejected" | "Returned";
type MainTabKey =
  | "edit_request"
  | "account_approval"
  | "advance_payment"
  | "movement_approval"
  | "rd_approval"
  | "advance_details"
  | "corporate_approval"
  | "lob"
  | "inactive"
  | "overdue";

type Lead = any;
type LeadWorkflowApproval = any;
type RDApprovalItem = {
  id: string;
  registrationId: string;
  trackingNumber: string;
  customerName: string;
  documentName?: string;
  documentType?: string;
  processType?: string;
  registrationOffice?: string;
  currentOffice?: string;
  currentOfficeId?: string | null;
  deliveryLocation: string;
  deliveryOfficeId?: string | null;
  status: string;
  remarks?: string;
  approvalRemarks?: string | null;
  requestedBy: string;
  requestedById?: string;
  requestedDate: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectedBy?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  mobile?: string;
  currentWorkflowStatus?: string;
};
type MovementApprovalItem = {
  id: string;
  registrationId: string;
  trackingNumber: string;
  customerName: string;
  documentName?: string;
  documentType?: string;
  registrationOffice?: string;
  currentOffice?: string;
  advanceAmount: number;
  totalAmount?: number;
  status: string;
  remarks?: string;
  approvalRemarks?: string | null;
  requestedBy: string;
  requestedDate: string;
  mobile?: string;
};
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

  const isSuperAdmin = Boolean(currentUser?.isSuperAdmin);

  const canViewEditRequests =
    isSuperAdmin ||
    Boolean(
      currentUser?.permissions?.includes("edit_request.view") ||
      currentUser?.permissions?.includes("edit_request.approve") ||
      currentUser?.permissions?.includes("edit_request.reject") ||
      currentUser?.permissions?.includes("*")
    );

  const canApproveEditRequests =
    isSuperAdmin ||
    Boolean(
      currentUser?.permissions?.includes("edit_request.approve") ||
      currentUser?.permissions?.includes("*")
    );

  const canRejectEditRequests =
    isSuperAdmin ||
    Boolean(
      currentUser?.permissions?.includes("edit_request.reject") ||
      currentUser?.permissions?.includes("*")
    );

  const canViewAccountApproval =
    isSuperAdmin ||
    Boolean(
      currentUser?.permissions?.includes("pending_approval.account_approval.view") ||
      currentUser?.permissions?.includes("account_approval.view") ||
      currentUser?.permissions?.includes("pending_approval.account_approval.approve") ||
      currentUser?.permissions?.includes("account_approval.approve") ||
      currentUser?.permissions?.includes("pending_approval.account_approval.reject") ||
      currentUser?.permissions?.includes("account_approval.reject") ||
      currentUser?.permissions?.includes("pending_approval.view") ||
      currentUser?.permissions?.includes("*")
    );

  const canApproveAccountApproval =
    isSuperAdmin ||
    Boolean(
      currentUser?.permissions?.includes("pending_approval.account_approval.approve") ||
      currentUser?.permissions?.includes("account_approval.approve") ||
      currentUser?.permissions?.includes("*")
    );

  const canRejectAccountApproval =
    isSuperAdmin ||
    Boolean(
      currentUser?.permissions?.includes("pending_approval.account_approval.reject") ||
      currentUser?.permissions?.includes("account_approval.reject") ||
      currentUser?.permissions?.includes("*")
    );

  const canViewAdvancePayment =
    isSuperAdmin ||
    Boolean(
      currentUser?.permissions?.includes("advance_payment_approval.view") ||
      currentUser?.permissions?.includes("*")
    );

  const canViewMovement =
    isSuperAdmin ||
    Boolean(
      currentUser?.permissions?.includes("movement_approval.view") ||
      currentUser?.permissions?.includes("*")
    );

  const canViewRDApproval =
    isSuperAdmin ||
    Boolean(
      currentUser?.permissions?.includes("pending_approval.rd_approval.view") ||
      currentUser?.permissions?.includes("rd_approval.view") ||
      currentUser?.permissions?.includes("pending_approval.rd_approval.approve") ||
      currentUser?.permissions?.includes("rd_approval.approve") ||
      currentUser?.permissions?.includes("pending_approval.rd_approval.reject") ||
      currentUser?.permissions?.includes("rd_approval.reject") ||
      currentUser?.permissions?.includes("pending_approval.view") ||
      currentUser?.permissions?.includes("*")
    );

  const canApproveRD =
    isSuperAdmin ||
    Boolean(
      currentUser?.permissions?.includes("pending_approval.rd_approval.approve") ||
      currentUser?.permissions?.includes("rd_approval.approve") ||
      currentUser?.permissions?.includes("*")
    );

  const canRejectRD =
    isSuperAdmin ||
    Boolean(
      currentUser?.permissions?.includes("pending_approval.rd_approval.reject") ||
      currentUser?.permissions?.includes("rd_approval.reject") ||
      currentUser?.permissions?.includes("*")
    );

  const canViewAdvanceDetails =
    isSuperAdmin ||
    Boolean(
      currentUser?.permissions?.includes("advance_details_approval.view") ||
      currentUser?.permissions?.includes("*")
    );

  const canViewCorporate =
    isSuperAdmin ||
    Boolean(
      currentUser?.permissions?.includes("corporate_details_approval.view") ||
      currentUser?.permissions?.includes("*")
    );

  const canViewLob =
    isSuperAdmin ||
    Boolean(
      currentUser?.permissions?.includes("lobApproval.view") ||
      currentUser?.permissions?.includes("lobApproval.approve") ||
      currentUser?.permissions?.includes("lobApproval.approve_all") ||
      currentUser?.permissions?.includes("lobApproval.approve_assigned_users") ||
      currentUser?.permissions?.includes("pending_approval.view") ||
      currentUser?.permissions?.includes("*")
    );

  const canViewInactive =
    isSuperAdmin ||
    Boolean(
      currentUser?.permissions?.includes("inactiveLead.view") ||
      currentUser?.permissions?.includes("*")
    );

  const canViewOverdue =
    isSuperAdmin ||
    Boolean(
      currentUser?.permissions?.includes("overdueFollowup.view") ||
      currentUser?.permissions?.includes("overdueFollowup.approve") ||
      currentUser?.permissions?.includes("overdueFollowup.return") ||
      currentUser?.permissions?.includes("overdueFollowup.reject") ||
      currentUser?.permissions?.includes("pending_approval.view") ||
      currentUser?.permissions?.includes("*")
    );

  const canApproveAdvance =
    isSuperAdmin ||
    Boolean(
      currentUser?.permissions?.includes("advance_payment_approval.approve") ||
      currentUser?.permissions?.includes("*")
    );

  const canRejectAdvance =
    isSuperAdmin ||
    Boolean(
      currentUser?.permissions?.includes("advance_payment_approval.reject") ||
      currentUser?.permissions?.includes("*")
    );

  const canApproveMovement =
    isSuperAdmin ||
    Boolean(
      currentUser?.permissions?.includes("movement_approval.approve") ||
      currentUser?.permissions?.includes("pending_approval.edit") ||
      currentUser?.permissions?.includes("*")
    );

  const canRejectMovement =
    isSuperAdmin ||
    Boolean(
      currentUser?.permissions?.includes("movement_approval.reject") ||
      currentUser?.permissions?.includes("pending_approval.edit") ||
      currentUser?.permissions?.includes("*")
    );

  const canManageAdvanceDetails =
    isSuperAdmin ||
    Boolean(
      currentUser?.permissions?.includes("advance_details_approval.manage") ||
      currentUser?.permissions?.includes("*")
    );

  const canApproveCorporate =
    isSuperAdmin ||
    Boolean(
      currentUser?.permissions?.includes("corporate_details_approval.approve") ||
      currentUser?.permissions?.includes("*")
    );

  const canRejectCorporate =
    isSuperAdmin ||
    Boolean(
      currentUser?.permissions?.includes("corporate_details_approval.reject") ||
      currentUser?.permissions?.includes("*")
    );

  const canEditCorporate =
    isSuperAdmin ||
    Boolean(
      currentUser?.permissions?.includes("corporate_details_approval.edit") ||
      currentUser?.permissions?.includes("*")
    );

  const canApproveLob =
    isSuperAdmin ||
    Boolean(
      currentUser?.permissions?.includes("lobApproval.approve") ||
      currentUser?.permissions?.includes("lobApproval.approve_all") ||
      currentUser?.permissions?.includes("lobApproval.approve_assigned_users") ||
      currentUser?.permissions?.includes("*")
    );

  const canRejectLob =
    isSuperAdmin ||
    Boolean(
      currentUser?.permissions?.includes("lobApproval.reject") ||
      currentUser?.permissions?.includes("lobApproval.approve_all") ||
      currentUser?.permissions?.includes("lobApproval.approve_assigned_users") ||
      currentUser?.permissions?.includes("*")
    );

  const canReturnLob =
    isSuperAdmin ||
    Boolean(
      currentUser?.permissions?.includes("lobApproval.return") ||
      currentUser?.permissions?.includes("lobApproval.approve_all") ||
      currentUser?.permissions?.includes("*")
    );

  const canApproveInactive =
    isSuperAdmin ||
    Boolean(
      currentUser?.permissions?.includes("inactiveLead.approve") ||
      currentUser?.permissions?.includes("*")
    );

  const canReturnInactive =
    isSuperAdmin ||
    Boolean(
      currentUser?.permissions?.includes("inactiveLead.return") ||
      currentUser?.permissions?.includes("*")
    );

  const canApproveOverdue =
    isSuperAdmin ||
    Boolean(
      currentUser?.permissions?.includes("overdueFollowup.approve") ||
      currentUser?.permissions?.includes("pending_approval.edit") ||
      currentUser?.permissions?.includes("*")
    );

  const canReturnOverdue =
    isSuperAdmin ||
    Boolean(
      currentUser?.permissions?.includes("overdueFollowup.return") ||
      currentUser?.permissions?.includes("pending_approval.edit") ||
      currentUser?.permissions?.includes("*")
    );

  const [editRequests, setEditRequests] = useState<RegistrationEditRequestItem[]>([]);
  const [approvingEditRequest, setApprovingEditRequest] = useState<RegistrationEditRequestItem | null>(null);
  const [rejectingEditRequest, setRejectingEditRequest] = useState<RegistrationEditRequestItem | null>(null);

  const [accountApprovals, setAccountApprovals] = useState<AccountApprovalItem[]>([]);
  const [approvingAccountItem, setApprovingAccountItem] = useState<AccountApprovalItem | null>(null);
  const [rejectingAccountItem, setRejectingAccountItem] = useState<AccountApprovalItem | null>(null);

  const [advancePaymentRequests, setAdvancePaymentRequests] = useState<AdvancePaymentApprovalItem[]>([]);
  const [movementApprovals, setMovementApprovals] = useState<MovementApprovalItem[]>([]);
  const [rdApprovals, setRdApprovals] = useState<RDApprovalItem[]>([]);
  const [approvingRDItem, setApprovingRDItem] = useState<RDApprovalItem | null>(null);
  const [rejectingRDItem, setRejectingRDItem] = useState<RDApprovalItem | null>(null);
  const [rdRemarks, setRdRemarks] = useState("");
  const [rdRejectionReason, setRdRejectionReason] = useState("");
  const [selectedMovementIds, setSelectedMovementIds] = useState<string[]>([]);
  const [isBulkMovementModalOpen, setIsBulkMovementModalOpen] = useState(false);
  const [bulkMovementRemarks, setBulkMovementRemarks] = useState("");
  const selectAllCheckboxRef = React.useRef<HTMLInputElement | null>(null);
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
  const [selectedLobDetail, setSelectedLobDetail] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [advanceDetailsLoading, setAdvanceDetailsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const permittedTabs = React.useMemo(() => {
    const list: { key: MainTabKey; label: string; count: number }[] = [];
    if (canViewEditRequests) {
      const pendingCount = editRequests.filter((r) => r.status === "PENDING").length;
      list.push({ key: "edit_request", label: "Edit Request", count: pendingCount });
    }
    if (canViewAccountApproval) {
      const pendingCount = accountApprovals.filter((r) => r.status === "Pending").length;
      list.push({ key: "account_approval", label: "Account Approval", count: pendingCount });
    }
    if (canViewAdvancePayment) {
      list.push({ key: "advance_payment", label: "Advance Payment Approvals", count: advancePaymentRequests.length });
    }
    if (canViewMovement) {
      list.push({ key: "movement_approval", label: "Movement Approval", count: movementApprovals.length });
    }
    if (canViewRDApproval) {
      list.push({ key: "rd_approval", label: "RD Approval", count: rdApprovals.length });
    }
    if (canViewAdvanceDetails) {
      list.push({ key: "advance_details", label: "Advance Details", count: hasSearchedAdvanceDetails ? allAdvanceRecords.length : 0 });
    }
    if (canViewCorporate) {
      list.push({ key: "corporate_approval", label: "Corporate Details Approval", count: corporateApprovals.length });
    }
    if (canViewLob) {
      list.push({ key: "lob", label: "LOB Requests", count: lobRequests.length });
    }
    if (canViewInactive) {
      list.push({ key: "inactive", label: "Inactive Leads", count: inactiveLeads.length });
    }
    if (canViewOverdue) {
      list.push({ key: "overdue", label: "Overdue Follow-ups", count: overdueFollowups.length });
    }
    return list;
  }, [
    canViewAccountApproval,
    canViewAdvancePayment,
    canViewMovement,
    canViewRDApproval,
    canViewAdvanceDetails,
    canViewCorporate,
    canViewLob,
    canViewInactive,
    canViewOverdue,
    accountApprovals.length,
    advancePaymentRequests.length,
    movementApprovals.length,
    rdApprovals.length,
    hasSearchedAdvanceDetails,
    allAdvanceRecords.length,
    corporateApprovals.length,
    lobRequests.length,
    inactiveLeads.length,
    overdueFollowups.length,
    canViewEditRequests,
    editRequests.length,
  ]);

  const [activeTab, setActiveTab] = useState<MainTabKey>("edit_request");

  useEffect(() => {
    if (permittedTabs.length > 0 && !permittedTabs.some((t) => t.key === activeTab)) {
      setActiveTab(permittedTabs[0].key);
    }
  }, [permittedTabs, activeTab]);

  const [actionModal, setActionModal] = useState<{
    type: ApprovalAction;
    requestType: string;
    id: string;
    title: string;
    meta?: any;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const editRequestPromise = canViewEditRequests
        ? parseResponse<{ items: RegistrationEditRequestItem[] }>(await fetch("/api/registration-edit-requests?status=PENDING", { cache: "no-store" })).catch(() => ({ items: [] }))
        : Promise.resolve({ items: [] });
      const accountPromise = canViewAccountApproval
        ? parseResponse<{ items: AccountApprovalItem[] }>(await fetch("/api/account-approvals?status=Pending", { cache: "no-store" })).catch(() => ({ items: [] }))
        : Promise.resolve({ items: [] });
      const advancePromise = canViewAdvancePayment
        ? parseResponse<{ items: AdvancePaymentApprovalItem[] }>(await fetch("/api/advance-payment-approvals?status=Pending Approval", { cache: "no-store" })).catch(() => ({ items: [] }))
        : Promise.resolve({ items: [] });
      const movementPromise = canViewMovement
        ? parseResponse<{ items: MovementApprovalItem[] }>(await fetch("/api/movement-approvals", { cache: "no-store" })).catch(() => ({ items: [] }))
        : Promise.resolve({ items: [] });
      const rdApprovalPromise = canViewRDApproval
        ? parseResponse<{ items: RDApprovalItem[] }>(await fetch("/api/rd-approvals?status=Pending", { cache: "no-store" })).catch(() => ({ items: [] }))
        : Promise.resolve({ items: [] });
      const corporatePromise = canViewCorporate
        ? parseResponse<{ items: any[] }>(await fetch("/api/lead-approvals/corporate-details", { cache: "no-store" })).catch(() => ({ items: [] }))
        : Promise.resolve({ items: [] });
      const inactivePromise = canViewInactive
        ? parseResponse<{ items: Lead[] }>(await fetch("/api/workflow-approvals/inactive", { cache: "no-store" })).catch(() => ({ items: [] }))
        : Promise.resolve({ items: [] });
      const lobPromise = canViewLob
        ? parseResponse<{ items: LeadWorkflowApproval[] }>(await fetch("/api/workflow-approvals/lob", { cache: "no-store" })).catch(() => ({ items: [] }))
        : Promise.resolve({ items: [] });
      const overduePromise = canViewOverdue
        ? parseResponse<{ items: Lead[] }>(await fetch("/api/workflow-approvals/overdue", { cache: "no-store" })).catch(() => ({ items: [] }))
        : Promise.resolve({ items: [] });
      const officesPromise = fetch("/api/offices/all", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ offices: [] }));

      const [editRes, accountRes, advanceRes, movementRes, rdRes, corporateRes, inactiveRes, lobRes, overdueRes, officesRes] = await Promise.all([
        editRequestPromise,
        accountPromise,
        advancePromise,
        movementPromise,
        rdApprovalPromise,
        corporatePromise,
        inactivePromise,
        lobPromise,
        overduePromise,
        officesPromise,
      ]);
      setEditRequests(editRes.items ?? []);
      setAccountApprovals(accountRes.items ?? []);
      setAdvancePaymentRequests(advanceRes.items ?? []);
      setMovementApprovals(movementRes.items ?? []);
      setRdApprovals(rdRes.items ?? []);
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

  const isAllMovementSelected =
    movementApprovals.length > 0 && selectedMovementIds.length === movementApprovals.length;
  const isSomeMovementSelected =
    selectedMovementIds.length > 0 && selectedMovementIds.length < movementApprovals.length;

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isSomeMovementSelected;
    }
  }, [isSomeMovementSelected]);

  const handleToggleSelectAllMovement = () => {
    if (isAllMovementSelected) {
      setSelectedMovementIds([]);
    } else {
      setSelectedMovementIds(movementApprovals.map((m) => m.id));
    }
  };

  const handleToggleSelectMovement = (id: string) => {
    setSelectedMovementIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  async function handleBulkApproveMovement() {
    if (selectedMovementIds.length === 0) return;
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await parseResponse<{ success: boolean; count: number }>(
        await fetch("/api/movement-approvals/bulk-approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ids: selectedMovementIds,
            remarks: bulkMovementRemarks.trim() || undefined,
          }),
        })
      );

      setSuccess(`Successfully approved ${selectedMovementIds.length} document movement(s).`);
      setIsBulkMovementModalOpen(false);
      setBulkMovementRemarks("");
      setSelectedMovementIds([]);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to bulk approve movement requests.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApproveRD(item: RDApprovalItem, remarks?: string) {
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await parseResponse(
        await fetch(`/api/rd-approvals/${item.id}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ remarks: remarks?.trim() || undefined }),
        })
      );
      setSuccess(`Successfully approved RD request for ${item.trackingNumber} to ${item.deliveryLocation}. Document moved to Ready For Delivery.`);
      setApprovingRDItem(null);
      setRdRemarks("");
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to approve RD request.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRejectRD(item: RDApprovalItem, rejectionReason: string) {
    if (!rejectionReason.trim()) {
      setError("Please provide a rejection reason.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await parseResponse(
        await fetch(`/api/rd-approvals/${item.id}/reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rejectionReason: rejectionReason.trim() }),
        })
      );
      setSuccess(`Successfully rejected RD request for ${item.trackingNumber}.`);
      setRejectingRDItem(null);
      setRdRejectionReason("");
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to reject RD request.");
    } finally {
      setSubmitting(false);
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
      } else if (actionModal.requestType === "MOVEMENT_APPROVAL") {
        const endpoint =
          actionModal.type === "Approved"
            ? `/api/movement-approvals/${actionModal.id}/approve`
            : `/api/movement-approvals/${actionModal.id}/reject`;

        const body: Record<string, string> = {};
        if (actionModal.type === "Rejected") {
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
      <section className="rounded-[28px] border border-(--border) bg-white/80 p-4 shadow-(--shadow-card) sm:p-5 dark:bg-white/5">
        {permittedTabs.length === 0 ? (
          <p className="text-xs font-semibold text-soft py-2">You do not have permission to view any approval queues.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {permittedTabs.map((tab) => {
              const active = tab.key === activeTab;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={[
                    "rounded-2xl border px-4 py-3 text-left transition cursor-pointer",
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
        )}
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
            {activeTab === "edit_request" && (
              <table className="min-w-345 text-left text-sm">
                <thead className="bg-blue-50 text-xs font-semibold tracking-wider text-soft dark:bg-white/5">
                  <tr>
                    <th className="px-5 py-4">Tracking Number</th>
                    <th className="px-5 py-4">Customer Name</th>
                    <th className="px-5 py-4">Document Type</th>
                    <th className="px-5 py-4">Registration Office</th>
                    <th className="px-5 py-4">Current Office</th>
                    <th className="px-5 py-4">Requested By</th>
                    <th className="px-5 py-4">Requested Date</th>
                    <th className="px-5 py-4">Changed Fields</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border) bg-white dark:bg-transparent">
                  {editRequests.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-soft">
                        No pending edit approval requests.
                      </td>
                    </tr>
                  ) : (
                    editRequests.map((item) => (
                      <tr key={item.id} className="transition hover:bg-blue-50/70 dark:hover:bg-white/5">
                        <td className="px-5 py-4 font-extrabold font-mono text-blue-700 dark:text-blue-400 whitespace-nowrap">
                          <Link
                            href={`/dashboard/document-details/${encodeURIComponent(item.trackingNumber)}`}
                            className="hover:underline"
                          >
                            {item.trackingNumber}
                          </Link>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900 dark:text-white">
                            {item.customerName ? formatTitleCase(item.customerName) : "-"}
                          </p>
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-700 dark:text-slate-300">
                          {item.documentType || item.documentName || "-"}
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                          {item.registrationOffice || "-"}
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                          {item.currentOffice || item.registrationOffice || "-"}
                        </td>
                        <td className="px-5 py-4 text-xs">
                          <p className="font-bold text-slate-900 dark:text-white">{item.requestedBy || "System User"}</p>
                        </td>
                        <td className="px-5 py-4 text-xs text-soft whitespace-nowrap">
                          {formatDateTime(item.requestedAt)}
                        </td>
                        <td className="px-5 py-4 text-xs">
                          <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            {item.fieldChanges?.length || 0} {item.fieldChanges?.length === 1 ? "field" : "fields"} changed
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {item.status === "PENDING" ? (
                              <>
                                {canApproveEditRequests && (
                                  <Button
                                    size="sm"
                                    onClick={() => setApprovingEditRequest(item)}
                                  >
                                    Approve
                                  </Button>
                                )}
                                {canRejectEditRequests && (
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => setRejectingEditRequest(item)}
                                  >
                                    Reject
                                  </Button>
                                )}
                                {!canApproveEditRequests && !canRejectEditRequests && (
                                  <span className="text-xs italic text-slate-400">View Only</span>
                                )}
                              </>
                            ) : (
                              <StatusBadge status={item.status} />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "account_approval" && (
              <table className="min-w-345 text-left text-sm">
                <thead className="bg-blue-50 text-xs font-semibold tracking-wider text-soft dark:bg-white/5">
                  <tr>
                    <th className="px-5 py-4">Tracking / Invoice #</th>
                    <th className="px-5 py-4">Customer / Item</th>
                    <th className="px-5 py-4">Office</th>
                    <th className="px-5 py-4">Category</th>
                    <th className="px-5 py-4">Amount (Old → New)</th>
                    <th className="px-5 py-4">Payment Mode</th>
                    <th className="px-5 py-4">Requested By</th>
                    <th className="px-5 py-4">Requested Date</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border) bg-white dark:bg-transparent">
                  {accountApprovals.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-soft">
                        No pending account statement approval requests.
                      </td>
                    </tr>
                  ) : (
                    accountApprovals.map((item) => (
                      <tr key={item.id} className="transition hover:bg-blue-50/70 dark:hover:bg-white/5">
                        <td className="px-5 py-4 font-extrabold font-mono text-blue-700 dark:text-blue-400 whitespace-nowrap">
                          {item.trackingNumber ? (
                            <Link
                              href={`/dashboard/document-details/${encodeURIComponent(item.trackingNumber)}`}
                              className="hover:underline"
                            >
                              {item.trackingNumber}
                            </Link>
                          ) : (
                            item.newInvoiceNumber || item.oldInvoiceNumber || "-"
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900 dark:text-white">
                            {item.customerName ? formatTitleCase(item.customerName) : "-"}
                          </p>
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-300">
                          {item.office || "-"}
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-700 dark:text-slate-300 text-xs">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-300">
                            {item.sourceType === "ADVANCE_PAYMENT" ? "Advance Payment" : "Account Panel"}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap font-mono text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 line-through">₹{item.oldAmount.toLocaleString("en-IN")}</span>
                            <span className="text-slate-400">→</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{item.newAmount.toLocaleString("en-IN")}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                          {item.newPaymentMode || item.oldPaymentMode || "Cash"}
                        </td>
                        <td className="px-5 py-4 text-xs">
                          <p className="font-bold text-slate-900 dark:text-white">{item.requestedByName || "Staff"}</p>
                        </td>
                        <td className="px-5 py-4 text-xs text-soft whitespace-nowrap">
                          {formatDateTime(item.requestedAt)}
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {item.status === "Pending" ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => setApprovingAccountItem(item)}
                                >
                                  Review & Approve
                                </Button>
                                {canRejectAccountApproval && (
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => setRejectingAccountItem(item)}
                                  >
                                    Reject
                                  </Button>
                                )}
                              </>
                            ) : (
                              <StatusBadge status={item.status} />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

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
                          <div className="flex items-center gap-2">
                            {canApproveAdvance && (
                              <Button
                                size="sm"
                                onClick={() => setApprovingAdvance(item)}
                              >
                                Approve
                              </Button>
                            )}
                            {canRejectAdvance && (
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
                            )}
                            {!canApproveAdvance && !canRejectAdvance && (
                              <span className="text-xs italic text-slate-400">
                                View Only
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "movement_approval" && (
              <div className="space-y-0">
                <div className="flex items-center justify-between border-b border-(--border) bg-blue-50/50 px-5 py-3 dark:bg-white/5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                    <span>
                      Selected:{" "}
                      <strong className="font-extrabold text-blue-700 dark:text-blue-400">
                        {selectedMovementIds.length}
                      </strong>{" "}
                      {selectedMovementIds.length === 1 ? "document" : "documents"}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    disabled={selectedMovementIds.length === 0 || !canApproveMovement}
                    onClick={() => setIsBulkMovementModalOpen(true)}
                  >
                    Approve Selected ({selectedMovementIds.length})
                  </Button>
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="bg-blue-50 text-xs font-semibold tracking-wider text-soft dark:bg-white/5">
                    <tr>
                      <th className="w-12 px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          ref={selectAllCheckboxRef}
                          checked={isAllMovementSelected}
                          onChange={handleToggleSelectAllMovement}
                          aria-label="Select all pending movement approvals"
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-4">Tracking Number</th>
                      <th className="px-4 py-4">Customer Name</th>
                      <th className="px-4 py-4">Document / Type</th>
                      <th className="px-4 py-4">Registration Office</th>
                      <th className="px-4 py-4">Current Office</th>
                      <th className="px-4 py-4">Requested By</th>
                      <th className="px-4 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border) bg-white dark:bg-transparent">
                    {movementApprovals.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-soft">
                          No pending movement approval requests.
                        </td>
                      </tr>
                    ) : (
                      movementApprovals.map((item) => (
                        <tr key={item.id} className="transition hover:bg-blue-50/70 dark:hover:bg-white/5">
                          <td className="w-12 px-4 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={selectedMovementIds.includes(item.id)}
                              onChange={() => handleToggleSelectMovement(item.id)}
                              aria-label={`Select document ${item.trackingNumber}`}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-4 font-extrabold font-mono text-blue-700 dark:text-blue-400 whitespace-nowrap">
                            <Link
                              href={`/dashboard/document-details/${encodeURIComponent(item.trackingNumber)}`}
                              className="hover:underline"
                            >
                              {item.trackingNumber}
                            </Link>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-bold text-slate-900 dark:text-white">{formatTitleCase(item.customerName)}</p>
                            {item.mobile && item.mobile !== "-" && <p className="text-xs text-soft">{item.mobile}</p>}
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-medium text-slate-800 dark:text-slate-200">{item.documentName ? formatTitleCase(item.documentName) : "-"}</p>
                            <p className="text-xs text-soft">{item.documentType ? formatTitleCase(item.documentType) : "-"}</p>
                          </td>
                          <td className="px-4 py-4 font-semibold text-slate-700 dark:text-slate-300">
                            {item.registrationOffice || "-"}
                          </td>
                          <td className="px-4 py-4 font-semibold text-slate-700 dark:text-slate-300">
                            {item.currentOffice || item.registrationOffice || "-"}
                          </td>
                          <td className="px-4 py-4 text-xs whitespace-nowrap">
                            <p className="font-medium text-slate-800 dark:text-slate-200">{item.requestedBy}</p>
                            <p className="text-soft">{formatDate(item.requestedDate)}</p>
                          </td>
                          <td className="px-4 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              {canApproveMovement && (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    setActionModal({
                                      type: "Approved",
                                      requestType: "MOVEMENT_APPROVAL",
                                      id: item.id,
                                      title: `Approve Document Movement (${item.trackingNumber})`,
                                      meta: item,
                                    })
                                  }
                                >
                                  Approve
                                </Button>
                              )}
                              {canRejectMovement && (
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() =>
                                    setActionModal({
                                      type: "Rejected",
                                      requestType: "MOVEMENT_APPROVAL",
                                      id: item.id,
                                      title: `Reject Document Movement (${item.trackingNumber})`,
                                      meta: item,
                                    })
                                  }
                                >
                                  Reject
                                </Button>
                              )}
                              {!canApproveMovement && !canRejectMovement && (
                                <span className="text-xs italic text-slate-400" title="Approval permission required">
                                  View Only
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "rd_approval" && (
              <div className="space-y-0">
                <table className="w-full text-left text-sm">
                  <thead className="bg-blue-50 text-xs font-semibold tracking-wider text-soft dark:bg-white/5">
                    <tr>
                      <th className="px-4 py-4">Tracking Number</th>
                      <th className="px-4 py-4">Customer Name</th>
                      <th className="px-4 py-4">Document / Process Type</th>
                      <th className="px-4 py-4">Registration Office</th>
                      <th className="px-4 py-4">Current Office</th>
                      <th className="px-4 py-4">Delivery Location</th>
                      <th className="px-4 py-4">Requested By</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border) bg-white dark:bg-transparent">
                    {rdApprovals.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-soft">
                          No pending RD approval requests.
                        </td>
                      </tr>
                    ) : (
                      rdApprovals.map((item) => (
                        <tr key={item.id} className="transition hover:bg-blue-50/70 dark:hover:bg-white/5">
                          <td className="px-4 py-4 font-extrabold font-mono text-blue-700 dark:text-blue-400 whitespace-nowrap">
                            <Link
                              href={`/dashboard/document-details/${encodeURIComponent(item.trackingNumber)}`}
                              className="hover:underline"
                            >
                              {item.trackingNumber}
                            </Link>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-bold text-slate-900 dark:text-white">{formatTitleCase(item.customerName)}</p>
                            {item.mobile && item.mobile !== "-" && <p className="text-xs text-soft">{item.mobile}</p>}
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-medium text-slate-800 dark:text-slate-200">{item.documentName ? formatTitleCase(item.documentName) : item.documentType ? formatTitleCase(item.documentType) : "-"}</p>
                            <p className="text-xs text-soft">{item.processType ? formatTitleCase(item.processType) : "-"}</p>
                          </td>
                          <td className="px-4 py-4 font-semibold text-slate-700 dark:text-slate-300">
                            {item.registrationOffice || "-"}
                          </td>
                          <td className="px-4 py-4 font-semibold text-slate-700 dark:text-slate-300">
                            {item.currentOffice || item.registrationOffice || "-"}
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                              <Building2 size={13} />
                              {item.deliveryLocation || "-"}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-xs whitespace-nowrap">
                            <p className="font-medium text-slate-800 dark:text-slate-200">{item.requestedBy}</p>
                            <p className="text-soft">{formatDate(item.requestedDate)}</p>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <StatusBadge status={item.status} />
                          </td>
                          <td className="px-4 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              {canApproveRD && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setApprovingRDItem(item);
                                    setRdRemarks("");
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  <CheckCircle2 size={14} />
                                  Approve
                                </Button>
                              )}
                              {canRejectRD && (
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => {
                                    setRejectingRDItem(item);
                                    setRdRejectionReason("");
                                  }}
                                >
                                  <XCircle size={14} />
                                  Reject
                                </Button>
                              )}
                              {!canApproveRD && !canRejectRD && (
                                <span className="text-xs italic text-slate-400" title="RD approval permission required">
                                  View Only
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
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
                                  {/* Edit button: ONLY for Approved records and if permitted */}
                                  {isApproved && canManageAdvanceDetails && (
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
                                  {/* Delete button: Visible if permitted */}
                                  {canManageAdvanceDetails && (
                                    <Button
                                      size="sm"
                                      variant="danger"
                                      onClick={() => setDeletingAdvance(item)}
                                      title="Delete Advance Payment"
                                      className="p-1.5 text-xs"
                                    >
                                      <Trash2 size={14} />
                                    </Button>
                                  )}
                                  {!canManageAdvanceDetails && !isApproved && (
                                    <span className="text-xs italic text-slate-400">View Only</span>
                                  )}
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
                            {canEditCorporate && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setEditingCorporate(item)}
                                title="Edit Info"
                              >
                                <Pencil size={14} className="mr-1" /> Edit
                              </Button>
                            )}
                            {canApproveCorporate && (
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
                            )}
                            {canRejectCorporate && (
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
                            )}
                            {!canEditCorporate && !canApproveCorporate && !canRejectCorporate && (
                              <span className="text-xs italic text-slate-400">View Only</span>
                            )}
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
                    <th className="px-5 py-4">Current Stage</th>
                    <th className="px-5 py-4">Requested Stage</th>
                    <th className="px-5 py-4">Reason</th>
                    <th className="px-5 py-4">Request Date</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border) bg-white dark:bg-transparent">
                  {lobRequests.length === 0 ? (
                    <tr><td colSpan={8} className="p-8 text-center text-soft">No pending LOB requests</td></tr>
                  ) : (
                    lobRequests.map((item) => {
                      const leadName = `${item.lead?.firstName || ""} ${item.lead?.lastName || ""}`.trim() || "Lead";
                      const requesterName = item.requester?.name || item.metadata?.requestedByName || formatTitleCase(item.requestedBy);
                      const requesterRole = item.requester?.role || item.metadata?.requestedByRole || "Staff";
                      const requesterOffice = item.requester?.office || item.metadata?.requestedByOffice || "N/A";
                      const reasonText = item.reason || item.approvalRemarks || item.metadata?.reason || "No reason specified";

                      return (
                        <tr key={item.id} className="transition hover:bg-blue-50/70 dark:hover:bg-white/5">
                          <td className="px-5 py-4">
                            <div className="font-bold text-slate-900 dark:text-white">{leadName}</div>
                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{item.lead?.leadCode}</span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{requesterName}</div>
                            <span className="text-xs text-soft">{requesterRole} • {requesterOffice}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-300">
                              {item.currentStatus || item.metadata?.currentStatus || item.lead?.leadStatus || "New"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                              LOB
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="max-w-xs truncate text-xs text-slate-700 dark:text-slate-300" title={reasonText}>
                              {reasonText}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-xs">{formatDate(item.requestedAt)}</td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                              Pending
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setSelectedLobDetail(item)}
                              >
                                View Details
                              </Button>
                              {canApproveLob && (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    setActionModal({
                                      type: "Approved",
                                      requestType: "LOB_REQUEST",
                                      id: item.id,
                                      title: "Approve LOB Request",
                                      meta: {
                                        leadCode: item.lead?.leadCode,
                                        leadName,
                                        requestedBy: requesterName,
                                        remarks: reasonText,
                                      },
                                    })
                                  }
                                >
                                  Approve
                                </Button>
                              )}
                              {canRejectLob && (
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() =>
                                    setActionModal({
                                      type: "Rejected",
                                      requestType: "LOB_REQUEST",
                                      id: item.id,
                                      title: "Reject LOB Request",
                                      meta: {
                                        leadCode: item.lead?.leadCode,
                                        leadName,
                                        requestedBy: requesterName,
                                        remarks: reasonText,
                                      },
                                    })
                                  }
                                >
                                  Reject
                                </Button>
                              )}
                              {!canApproveLob && !canRejectLob && (
                                <span className="text-xs italic text-slate-400">View Only</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
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
                            {canApproveInactive && (
                              <Button size="sm" onClick={() => setActionModal({ type: "Approved", requestType: "INACTIVE_LEAD", id: item.id, title: "Move Inactive Lead to LOB" })}>Move to LOB</Button>
                            )}
                            {canReturnInactive && (
                              <Button variant="ghost" size="sm" onClick={() => setActionModal({ type: "Returned", requestType: "INACTIVE_LEAD", id: item.id, title: "Return to User" })}>Return to User</Button>
                            )}
                            {!canApproveInactive && !canReturnInactive && (
                              <span className="text-xs italic text-slate-400">View Only</span>
                            )}
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
                            {canApproveOverdue && (
                              <Button size="sm" onClick={() => setActionModal({ type: "Approved", requestType: "OVERDUE_FOLLOWUP", id: item.id, title: "Unlock Follow-up" })}>Unlock</Button>
                            )}
                            {canReturnOverdue && (
                              <Button variant="ghost" size="sm" onClick={() => setActionModal({ type: "Returned", requestType: "OVERDUE_FOLLOWUP", id: item.id, title: "Return to User" })}>Return to User</Button>
                            )}
                            {!canApproveOverdue && !canReturnOverdue && (
                              <span className="text-xs italic text-slate-400">View Only</span>
                            )}
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
        description={
          actionModal?.requestType === "MOVEMENT_APPROVAL"
            ? actionModal.type === "Approved"
              ? "Review zero-advance movement request details and confirm approval."
              : "Specify reason for rejecting zero-advance movement request."
            : actionModal?.type === "Rejected"
            ? "Rejection reason is required."
            : "Provide remarks for this action."
        }
        placement="center"
      >
        {actionModal && (
          <div className="grid gap-4 text-xs sm:text-sm">
            {/* Movement Approval Document Summary Card */}
            {actionModal.requestType === "MOVEMENT_APPROVAL" && actionModal.meta && (
              <div className="space-y-3">
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 dark:border-blue-900/40 dark:bg-blue-950/20">
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Tracking Number:</span>
                      <p className="font-mono font-bold text-blue-700 dark:text-blue-300">
                        {actionModal.meta.trackingNumber}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Customer:</span>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {formatTitleCase(actionModal.meta.customerName)}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Registration Office:</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {actionModal.meta.registrationOffice || "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Current Office:</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {actionModal.meta.currentOffice || actionModal.meta.registrationOffice || "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Advance Paid:</span>
                      <p className="font-bold text-rose-600 dark:text-rose-400">
                        ₹{Number(actionModal.meta.advanceAmount || 0).toFixed(2)} (Zero Advance)
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Requested By:</span>
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {actionModal.meta.requestedBy || "System User"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Original Requester Remarks Callout */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/30">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
                    <AlertCircle size={14} className="text-amber-600 dark:text-amber-400" />
                    <span>Requester Reason / Remarks:</span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
                    {actionModal.meta.remarks || "No remarks provided"}
                  </p>
                </div>
              </div>
            )}

            <Textarea
              label={
                actionModal.type === "Rejected"
                  ? "Rejection Reason *"
                  : actionModal.requestType === "MOVEMENT_APPROVAL"
                  ? "Approval Remarks (Optional)"
                  : "Remarks"
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                actionModal.type === "Rejected"
                  ? "Enter specific reason for rejecting request..."
                  : actionModal.requestType === "MOVEMENT_APPROVAL"
                  ? "Optional note (e.g. Approved per branch manager authorization)..."
                  : "Optional remarks..."
              }
              required={actionModal.type === "Rejected"}
            />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setActionModal(null)} disabled={submitting}>Cancel</Button>
              <Button
                variant={actionModal.type === "Rejected" ? "danger" : "primary"}
                onClick={() => void submitAction()}
                disabled={submitting || (actionModal.type === "Rejected" && !reason.trim())}
              >
                {submitting
                  ? "Processing..."
                  : actionModal.type === "Approved"
                  ? (actionModal.requestType === "MOVEMENT_APPROVAL" ? "Confirm Approve" : "Confirm Approval")
                  : "Confirm Rejection"}
              </Button>
            </div>
          </div>
        )}
      </FormDrawer>

      {/* Bulk Movement Approval Modal */}
      <FormDrawer
        open={isBulkMovementModalOpen}
        onClose={() => {
          if (!submitting) {
            setIsBulkMovementModalOpen(false);
            setBulkMovementRemarks("");
          }
        }}
        title="Approve Document Movements"
        description={`You are about to approve ${selectedMovementIds.length} selected document movement(s).`}
        placement="center"
      >
        <div className="grid gap-4">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Selected documents will be marked as approved for movement and will become transferable in Home → Document In Hand.
          </p>
          <Textarea
            label="Remarks"
            value={bulkMovementRemarks}
            onChange={(e) => setBulkMovementRemarks(e.target.value)}
            placeholder="Optional remarks applying to all selected document movements..."
          />
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setIsBulkMovementModalOpen(false);
                setBulkMovementRemarks("");
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleBulkApproveMovement()}
              disabled={submitting || selectedMovementIds.length === 0}
            >
              {submitting ? "Processing..." : "Submit Action"}
            </Button>
          </div>
        </div>
      </FormDrawer>

      <CorporateDetailFormModal
        open={Boolean(editingCorporate)}
        onClose={() => setEditingCorporate(null)}
        onSuccess={() => void loadData()}
        initialData={editingCorporate}
        title="Edit Pending Corporate Details"
        description="Update corporate details before approving or rejecting."
      />

      {/* Edit Request Diff / Approve Modal */}
      <EditRequestDiffModal
        isOpen={Boolean(approvingEditRequest)}
        onClose={() => setApprovingEditRequest(null)}
        request={approvingEditRequest}
        onApprove={async (id) => {
          try {
            const res = await parseResponse<{ message?: string }>(
              await fetch(`/api/registration-edit-requests/${id}/approve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
              })
            );
            setSuccess(res.message || "Edit request approved successfully.");
          } finally {
            await loadData();
          }
        }}
      />

      {/* Edit Request Reject Modal */}
      <RejectEditRequestModal
        isOpen={Boolean(rejectingEditRequest)}
        onClose={() => setRejectingEditRequest(null)}
        request={rejectingEditRequest}
        onReject={async (id, rejectionReason) => {
          try {
            const res = await parseResponse<{ message?: string }>(
              await fetch(`/api/registration-edit-requests/${id}/reject`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rejectionReason }),
              })
            );
            setSuccess(res.message || "Edit request rejected.");
          } finally {
            await loadData();
          }
        }}
      />

      {/* LOB Request Details Modal */}
      {selectedLobDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                LOB Approval Request Details
              </h3>
              <button
                type="button"
                onClick={() => setSelectedLobDetail(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 dark:bg-white/5">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Lead Code</span>
                  <p className="font-bold text-blue-600 dark:text-blue-400">{selectedLobDetail.lead?.leadCode}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Lead Name</span>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {`${selectedLobDetail.lead?.firstName || ""} ${selectedLobDetail.lead?.lastName || ""}`.trim() || "Lead"}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Current Stage</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedLobDetail.currentStatus || selectedLobDetail.metadata?.currentStatus || selectedLobDetail.lead?.leadStatus || "New"}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Requested Stage</span>
                  <p className="font-bold text-amber-600 dark:text-amber-400">LOB</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Requested By</span>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {selectedLobDetail.requester?.name || selectedLobDetail.metadata?.requestedByName || selectedLobDetail.requestedBy}
                  </p>
                  <span className="text-xs text-slate-400">
                    {selectedLobDetail.requester?.role || selectedLobDetail.metadata?.requestedByRole || "Staff"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Office</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedLobDetail.requester?.office || selectedLobDetail.metadata?.requestedByOffice || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Request Date</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200">{formatDate(selectedLobDetail.requestedAt)}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Request Status</span>
                  <p className="font-bold text-blue-600 dark:text-blue-400">{selectedLobDetail.status || "Pending"}</p>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/30">
                <span className="block text-xs font-bold text-amber-900 dark:text-amber-200 mb-1">
                  Reason for moving to LOB:
                </span>
                <p className="text-xs font-medium text-amber-900/90 dark:text-amber-200/90 leading-relaxed whitespace-pre-wrap">
                  {selectedLobDetail.reason || selectedLobDetail.approvalRemarks || selectedLobDetail.metadata?.reason || "No reason provided"}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <Button variant="ghost" onClick={() => setSelectedLobDetail(null)}>
                Close
              </Button>
              {canRejectLob && (
                <Button
                  variant="danger"
                  onClick={() => {
                    const item = selectedLobDetail;
                    const lName = `${item.lead?.firstName || ""} ${item.lead?.lastName || ""}`.trim() || "Lead";
                    const rName = item.requester?.name || item.metadata?.requestedByName || item.requestedBy;
                    const rText = item.reason || item.approvalRemarks || item.metadata?.reason || "";
                    setSelectedLobDetail(null);
                    setActionModal({
                      type: "Rejected",
                      requestType: "LOB_REQUEST",
                      id: item.id,
                      title: "Reject LOB Request",
                      meta: {
                        leadCode: item.lead?.leadCode,
                        leadName: lName,
                        requestedBy: rName,
                        remarks: rText,
                      },
                    });
                  }}
                >
                  Reject
                </Button>
              )}
              {canApproveLob && (
                <Button
                  onClick={() => {
                    const item = selectedLobDetail;
                    const lName = `${item.lead?.firstName || ""} ${item.lead?.lastName || ""}`.trim() || "Lead";
                    const rName = item.requester?.name || item.metadata?.requestedByName || item.requestedBy;
                    const rText = item.reason || item.approvalRemarks || item.metadata?.reason || "";
                    setSelectedLobDetail(null);
                    setActionModal({
                      type: "Approved",
                      requestType: "LOB_REQUEST",
                      id: item.id,
                      title: "Approve LOB Request",
                      meta: {
                        leadCode: item.lead?.leadCode,
                        leadName: lName,
                        requestedBy: rName,
                        remarks: rText,
                      },
                    });
                  }}
                >
                  Approve
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RD Approval Approve Modal */}
      {approvingRDItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" />
                Approve RD Request
              </h3>
              <button
                type="button"
                onClick={() => setApprovingRDItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-white/5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Tracking Number:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{approvingRDItem.trackingNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Customer Name:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{formatTitleCase(approvingRDItem.customerName)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Delivery Location:</span>
                  <span className="font-extrabold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <Building2 size={12} />
                    {approvingRDItem.deliveryLocation}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Current Office:</span>
                  <span className="text-slate-700 dark:text-slate-300">{approvingRDItem.currentOffice || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Requested By:</span>
                  <span className="text-slate-700 dark:text-slate-300">{approvingRDItem.requestedBy}</span>
                </div>
              </div>

              <div>
                <Textarea
                  label="Approval Remarks (Optional)"
                  value={rdRemarks}
                  onChange={(e) => setRdRemarks(e.target.value)}
                  placeholder="Enter any approval notes or instructions..."
                  rows={3}
                />
              </div>

              <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                Approving this request will immediately move the document to <strong>Ready For Delivery</strong> for <strong>{approvingRDItem.deliveryLocation}</strong>.
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <Button variant="ghost" disabled={submitting} onClick={() => setApprovingRDItem(null)}>
                Cancel
              </Button>
              <Button
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => void handleApproveRD(approvingRDItem, rdRemarks)}
              >
                {submitting ? "Approving..." : "Confirm & Approve"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* RD Approval Reject Modal */}
      {rejectingRDItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 text-rose-600">
                <XCircle size={18} />
                Reject RD Request
              </h3>
              <button
                type="button"
                onClick={() => setRejectingRDItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-white/5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Tracking Number:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{rejectingRDItem.trackingNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Customer Name:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{formatTitleCase(rejectingRDItem.customerName)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Delivery Location:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{rejectingRDItem.deliveryLocation}</span>
                </div>
              </div>

              <div>
                <Textarea
                  label="Rejection Reason *"
                  value={rdRejectionReason}
                  onChange={(e) => setRdRejectionReason(e.target.value)}
                  placeholder="Provide reason for rejecting this RD request..."
                  rows={3}
                  required
                />
              </div>

              <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                Rejecting this request will keep the document in its current Document In Hand workflow state.
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <Button variant="ghost" disabled={submitting} onClick={() => setRejectingRDItem(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={submitting || !rdRejectionReason.trim()}
                onClick={() => void handleRejectRD(rejectingRDItem, rdRejectionReason)}
              >
                {submitting ? "Rejecting..." : "Confirm Rejection"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Account Approval Comparison Modal */}
      {approvingAccountItem && (
        <AccountApprovalDiffModal
          isOpen={Boolean(approvingAccountItem)}
          onClose={() => setApprovingAccountItem(null)}
          request={approvingAccountItem}
          onApprove={async (id, remarks) => {
            const res = await fetch(`/api/account-approvals/${id}/approve`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ approvalRemarks: remarks }),
            });
            const data = await res.json();
            if (!res.ok) {
              throw new Error(data.error || data.message || "Failed to approve transaction.");
            }
            setSuccess("Account transaction edit approved successfully.");
            setApprovingAccountItem(null);
            void loadData();
          }}
          onOpenReject={(item) => setRejectingAccountItem(item)}
          canApprove={canApproveAccountApproval}
          canReject={canRejectAccountApproval}
        />
      )}

      {/* Account Approval Reject Modal */}
      {rejectingAccountItem && (
        <AccountApprovalRejectModal
          isOpen={Boolean(rejectingAccountItem)}
          onClose={() => setRejectingAccountItem(null)}
          request={rejectingAccountItem}
          onReject={async (id, reason) => {
            const res = await fetch(`/api/account-approvals/${id}/reject`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ rejectionReason: reason }),
            });
            const data = await res.json();
            if (!res.ok) {
              throw new Error(data.error || data.message || "Failed to reject transaction.");
            }
            setSuccess("Account transaction edit rejected successfully.");
            setRejectingAccountItem(null);
            void loadData();
          }}
        />
      )}
    </div>
  );
}
