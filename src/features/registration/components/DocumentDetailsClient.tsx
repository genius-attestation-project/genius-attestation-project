"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileEdit,
  History,
  Pencil,
  Printer,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";
import { Country } from "country-state-city";
import { Button } from "@/components/ui/Button";
import { formatDate, formatDateTime } from "@/utils/format";
import { AdvanceHistoryTable } from "@/features/revenue/components/AdvanceHistoryTable";
import { useDocumentMovementRealtime } from "@/features/document-movement/hooks/useDocumentMovementRealtime";

type Props = { trackingNumber: string };
type SelectOption = { value: string; label: string };

type DetailField = {
  key?: string;
  label: string;
  value: React.ReactNode;
  editable?: boolean;
  type?: "text" | "number" | "select";
  options?: SelectOption[];
};

function isUserIdLike(val: unknown): boolean {
  if (typeof val !== "string") return false;
  const s = val.trim();
  if (!s) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return true;
  if (/^c[a-z0-9]{20,32}$/i.test(s)) return true;
  if (/^(other|owner|staff|test)[_-][a-z0-9_-]+$/i.test(s)) return true;
  return false;
}

function formatAuditUser(val: unknown, fallback = "Unknown User"): string {
  if (!val) return fallback;
  if (typeof val === "object" && val !== null && "name" in val) {
    const name = (val as any).name;
    return typeof name === "string" && name.trim() && !isUserIdLike(name) ? name.trim() : fallback;
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed || isUserIdLike(trimmed)) return fallback;
    return trimmed;
  }
  return fallback;
}

function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="print-section overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <h2 className="bg-[#195b8e] px-4 py-3 text-center text-base font-extrabold uppercase tracking-wide text-white sm:text-lg">
        {title}
      </h2>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}

function statusClass(status: string) {
  if (/reject|cancel|fail/i.test(status)) return "text-red-600";
  if (/pending|transfer|hold|inbound/i.test(status)) return "text-amber-600";
  return "text-lime-700";
}

function normalizeVal(val: any): string {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

const CUSTOMER_TYPE_OPTIONS: SelectOption[] = [
  { value: "Individual", label: "Individual" },
  { value: "Corporate", label: "Corporate" },
];

const PRIORITY_OPTIONS: SelectOption[] = [
  { value: "Normal", label: "Normal" },
  { value: "Urgent", label: "Urgent" },
  { value: "Super Urgent", label: "Super Urgent" },
];

const EDITABLE_FIELD_DEFINITIONS: Record<
  string,
  { label: string; section: string; type: "text" | "number" | "select" }
> = {
  documentType: { label: "Document Type", section: "Document Type", type: "select" },
  processType: { label: "Process Type", section: "Document Type", type: "select" },
  committedDuration: { label: "Committed Duration / SLA", section: "Document Type", type: "number" },
  priority: { label: "Priority", section: "Document Type", type: "select" },
  customerType: { label: "Customer Type", section: "Document Type", type: "select" },
  documentIssuedCountry: { label: "Issued Country", section: "Document Type", type: "select" },
  deliveryLocation: { label: "Delivery Location", section: "Document Type", type: "select" },
  externalProcess: { label: "Additional Process", section: "Document Type", type: "text" },
  documentName: { label: "Document Name", section: "Document Details", type: "text" },
  subPackage: { label: "Sub Package", section: "Document Details", type: "select" },
  registeredPerson: { label: "Registered By", section: "Document Details", type: "text" },
  collectedPerson: { label: "Collected By", section: "Document Details", type: "text" },
  customerName: { label: "Customer Name", section: "Customer Information", type: "text" },
  mobile: { label: "Mobile", section: "Customer Information", type: "text" },
  email: { label: "Email", section: "Customer Information", type: "text" },
  country: { label: "Country", section: "Customer Information", type: "select" },
  state: { label: "State", section: "Customer Information", type: "text" },
  city: { label: "City", section: "Customer Information", type: "text" },
  address: { label: "Address", section: "Customer Information", type: "text" },
};

export function DocumentDetailsClient({ trackingNumber }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Field-level inline edit state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingFields, setEditingFields] = useState<Set<string>>(new Set());
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [userRemarks, setUserRemarks] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Master Data dropdown options
  const [documentTypeOptions, setDocumentTypeOptions] = useState<SelectOption[]>([]);
  const [processTypeOptions, setProcessTypeOptions] = useState<{ value: string; label: string; subPackages?: any[] }[]>([]);
  const [subPackageOptions, setSubPackageOptions] = useState<SelectOption[]>([]);
  const [officeOptions, setOfficeOptions] = useState<SelectOption[]>([]);
  const [countryOptions, setCountryOptions] = useState<SelectOption[]>([]);
  const [masterDataLoaded, setMasterDataLoaded] = useState(false);

  const fetchDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/document-details/${encodeURIComponent(trackingNumber)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to load document details.");
      setData(json);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [trackingNumber]);

  useDocumentMovementRealtime({
    onMovement: (event) => {
      if (!event?.trackingNumbers || event.trackingNumbers.includes(trackingNumber)) {
        fetchDetails();
      }
    },
  });

  const loadMasterData = async () => {
    if (masterDataLoaded) return;
    try {
      // 1. Countries
      const allCountries = Country.getAllCountries().map((c) => ({
        value: c.name,
        label: c.name,
      }));
      setCountryOptions(allCountries);

      // 2. Fetch active Document Types, Process Types, and Offices in parallel
      const [docRes, procRes, offRes] = await Promise.all([
        fetch("/api/master-data/document-types?active=true").then((r) => r.json()).catch(() => ({})),
        fetch("/api/master-data/process-types?active=true").then((r) => r.json()).catch(() => ({})),
        fetch("/api/offices/all").then((r) => r.json()).catch(() => ({})),
      ]);

      const docItems: SelectOption[] = (docRes.items || []).map((i: any) => ({
        value: i.name,
        label: i.name,
      }));
      setDocumentTypeOptions(docItems);

      const procItems = (procRes.items || []).map((i: any) => ({
        value: i.name,
        label: i.name,
        subPackages: i.subPackages || [],
      }));
      setProcessTypeOptions(procItems);

      const offItems: SelectOption[] = (offRes.offices || offRes.data || []).map((o: any) => ({
        value: o.officeName || o.name,
        label: o.officeName || o.name,
      }));
      setOfficeOptions(offItems);

      setMasterDataLoaded(true);
    } catch (err) {
      console.error("[loadMasterData] Error loading dropdown options:", err);
    }
  };

  const reg = data?.registration;

  // Dynamically update subPackageOptions when processType is selected
  useEffect(() => {
    const currentProc = formValues.processType || reg?.processType;
    if (!currentProc || processTypeOptions.length === 0) {
      setSubPackageOptions([]);
      return;
    }
    const matched = processTypeOptions.find(
      (p) => p.value.toLowerCase().trim() === currentProc.toLowerCase().trim()
    );
    if (matched?.subPackages?.length) {
      setSubPackageOptions(
        matched.subPackages.map((s: any) => ({ value: s.name, label: s.name }))
      );
    } else {
      setSubPackageOptions([]);
    }
  }, [formValues.processType, processTypeOptions, reg?.processType]);

  const toggleEditMode = () => {
    if (!isEditMode) {
      // If an edit request is already pending, notify and show modal
      if (data?.pendingEditRequest) {
        setShowPendingModal(true);
        return;
      }
      // Populate formValues with current saved values from reg
      setFormValues({
        documentType: reg?.documentType || "",
        processType: reg?.processType || "",
        committedDuration: reg?.committedDuration || "",
        priority: reg?.priority || "Normal",
        customerType: reg?.customerType || "Individual",
        documentIssuedCountry: reg?.documentIssuedCountry || "",
        deliveryLocation: reg?.deliveryLocation || "",
        externalProcess: reg?.externalProcess || "",
        documentName: reg?.documentName || "",
        subPackage: reg?.subPackage && reg?.subPackage !== "-" ? reg?.subPackage : "",
        registeredPerson: reg?.registeredPerson || "",
        collectedPerson: reg?.collectedPerson || "",
        customerName: reg?.customerName || "",
        mobile: reg?.mobile || "",
        email: reg?.email || "",
        country: reg?.country || "",
        address: reg?.address || "",
        state: reg?.state || "",
        city: reg?.city || "",
      });
      setEditingFields(new Set());
      setIsEditMode(true);
      loadMasterData();
    } else {
      handleCancelEdit();
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditingFields(new Set());
    setFormValues({});
    setSubmitError(null);
  };

  const toggleFieldEdit = (fieldKey: string) => {
    loadMasterData();
    setEditingFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldKey)) {
        next.delete(fieldKey);
      } else {
        next.add(fieldKey);
      }
      return next;
    });
  };

  const handleFieldChange = (fieldKey: string, value: any) => {
    setFormValues((prev) => {
      const next = { ...prev, [fieldKey]: value };
      // If processType changed, check if subPackage is still valid
      if (fieldKey === "processType") {
        next.subPackage = "";
      }
      return next;
    });
  };

  const revertField = (fieldKey: string) => {
    if (!reg) return;
    setFormValues((prev) => ({
      ...prev,
      [fieldKey]: reg[fieldKey] ?? "",
    }));
    setEditingFields((prev) => {
      const next = new Set(prev);
      next.delete(fieldKey);
      return next;
    });
  };

  // Compare original reg values against formValues to identify changed fields
  const modifiedFields = useMemo(() => {
    if (!reg || !isEditMode) return [];
    const diffs: { key: string; label: string; oldValue: string; newValue: string }[] = [];

    for (const [key, def] of Object.entries(EDITABLE_FIELD_DEFINITIONS)) {
      const orig = normalizeVal(reg[key]);
      const curr = normalizeVal(formValues[key]);
      if (orig !== curr) {
        diffs.push({
          key,
          label: def.label,
          oldValue: orig || "(Empty)",
          newValue: curr || "(Empty)",
        });
      }
    }
    return diffs;
  }, [reg, formValues, isEditMode]);

  const handleOpenSaveModal = () => {
    if (modifiedFields.length === 0) return;
    setSubmitError(null);
    setUserRemarks("");
    setShowConfirmModal(true);
  };

  const handleSubmitEditRequest = async () => {
    if (!reg) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        trackingNumber: reg.trackingNumber,
        customerName: formValues.customerName ?? reg.customerName ?? "",
        mobile: formValues.mobile ?? reg.mobile ?? "",
        email: formValues.email ?? reg.email ?? "",
        address: formValues.address ?? reg.address ?? "",
        country: formValues.country ?? reg.country ?? "",
        state: formValues.state ?? reg.state ?? "",
        city: formValues.city ?? reg.city ?? "",
        customerType: formValues.customerType ?? reg.customerType ?? "Individual",
        corporateDetailId: reg.corporateDetailId ?? "",
        documentType: formValues.documentType ?? reg.documentType ?? "",
        documentName: formValues.documentName ?? reg.documentName ?? "",
        documentIssuedCountry: formValues.documentIssuedCountry ?? reg.documentIssuedCountry ?? "",
        processType: formValues.processType ?? reg.processType ?? "",
        subPackage: formValues.subPackage ?? (reg.subPackage === "-" ? "" : reg.subPackage) ?? "",
        externalProcess: formValues.externalProcess ?? reg.externalProcess ?? "",
        priority: formValues.priority ?? reg.priority ?? "Normal",
        committedDuration: formValues.committedDuration ?? reg.committedDuration ?? "",
        deliveryLocation: formValues.deliveryLocation ?? reg.deliveryLocation ?? "",
        totalCharges: Number(reg.totalCharges || 0),
        advancePaid: Number(reg.advancePaid || 0),
        requestedAdvanceAmount: 0,
        collectedPerson: formValues.collectedPerson ?? reg.collectedPerson ?? "",
        registeredPerson: formValues.registeredPerson ?? reg.registeredPerson ?? "",
        regionOfRegistration: reg.regionOfRegistration ?? "",
        approvalStatus: reg.approvalStatus ?? "Pending",
        trackingStatus: reg.trackingStatus || "Registered",
        remarks: userRemarks.trim() || undefined,
      };

      const res = await fetch(`/api/registrations/${encodeURIComponent(reg.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error(
            resJson.message ||
              "This document already has a pending edit request. Please wait until the existing request is approved or rejected before submitting conflicting changes."
          );
        }
        throw new Error(resJson.message || "Failed to submit edit request. Please try again.");
      }

      setShowConfirmModal(false);
      setIsEditMode(false);
      setEditingFields(new Set());
      setFormValues({});
      setActionSuccessMessage(
        resJson.message ||
          "Edit approval request submitted successfully. Changes will apply upon approval in Pending Approval > Edit Request."
      );

      // Refresh document details so pendingEditRequest banner appears
      await fetchDetails();
    } catch (err: any) {
      setSubmitError(err.message || "Unable to submit edit request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 bg-white dark:bg-slate-900 p-8 text-lg font-bold text-slate-700 dark:text-slate-200">
        <RefreshCw className="animate-spin text-[#195b8e]" /> Loading document details...
      </div>
    );
  }

  if (error || !data || !data.registration) {
    return (
      <div className="mx-auto my-8 max-w-3xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center">
        <p className="mb-5 text-lg font-bold text-red-700 dark:text-red-400">{error || "Unable to locate record."}</p>
        <Link href="/dashboard/revenue-registration">
          <Button variant="secondary">Back to Registrations</Button>
        </Link>
      </div>
    );
  }

  const {
    currentProcess: proc = {},
    movementHistory = [],
    workflowHistory = [],
    advancePaymentApprovals = [],
    linkedDocuments = [],
    canEdit = false,
    pendingEditRequest = null,
  } = data;

  const currentStatus = proc?.currentStatus || reg?.trackingStatus || "Registered";

  const paymentFields: DetailField[] = [
    { label: "Total Amount", value: `₹${Number(reg.totalCharges || 0).toFixed(2)}` },
    { label: "Advance", value: `₹${Number(reg.advancePaid || 0).toFixed(2)}` },
    { label: "Balance", value: `₹${Number(reg.balanceAmount || 0).toFixed(2)}` },
    { label: "Balance Received", value: `₹${Number(reg.balanceReceivedAmount || 0).toFixed(2)}` },
    { label: "Payment Mode", value: reg.paymentMode || "-" },
    { label: "Payment Status", value: reg.paymentStatus || "Pending" },
    { label: "Payment Reference Number", value: reg.paymentReferenceNo },
    { label: "UPI Transaction ID", value: reg.upiTransactionId },
    { label: "Bank Name", value: reg.bankName },
    { label: "Transaction Reference", value: reg.transactionRefNo },
    { label: "Transfer Date", value: reg.transferDate ? formatDate(reg.transferDate) : null },
    { label: "Cheque Number", value: reg.chequeNumber },
    { label: "Cheque Date", value: reg.chequeDate ? formatDate(reg.chequeDate) : null },
    { label: "DD Number", value: reg.ddNumber },
    { label: "DD Date", value: reg.ddDate ? formatDate(reg.ddDate) : null },
    { label: "Card (Last 4)", value: reg.cardLast4 },
    { label: "Approval Code", value: reg.approvalCode },
    { label: "Payment Gateway", value: reg.paymentGateway },
    { label: "Online Transaction ID", value: reg.onlineTransactionId },
    { label: "Wallet", value: reg.walletName },
    { label: "Wallet Transaction ID", value: reg.walletTransactionId },
    { label: "Payment Description", value: reg.paymentDescription },
  ].filter((field) => field.value !== null && field.value !== undefined && field.value !== "");

  function renderFieldGrid(fields: DetailField[]) {
    return (
      <dl className="grid grid-cols-1 gap-x-12 gap-y-4 md:grid-cols-2">
        {fields.map((field) => {
          const { key, label, value, editable, type = "text", options = [] } = field;
          const isFieldEditable = Boolean(isEditMode && editable && key);
          const isActivelyEditing = Boolean(key && editingFields.has(key));
          const currentVal = key ? formValues[key] : undefined;
          const origVal = key ? reg[key] : undefined;
          const isModified = Boolean(key && normalizeVal(origVal) !== normalizeVal(currentVal));

          return (
            <div
              key={label}
              className={`grid grid-cols-[minmax(9rem,38%)_1fr] gap-3 text-sm sm:text-base rounded-xl p-1.5 transition ${
                isModified
                  ? "bg-blue-50/60 dark:bg-blue-950/20 ring-1 ring-blue-300 dark:ring-blue-800"
                  : ""
              }`}
            >
              <dt className="font-bold text-slate-500 dark:text-slate-400 self-center">{label}</dt>
              <dd className="font-semibold text-slate-900 dark:text-slate-100 wrap-break-word">
                {!isFieldEditable ? (
                  // Read-only presentation (or non-editable field)
                  <div className="flex items-center justify-between gap-2">
                    <span>{value ?? "-"}</span>
                  </div>
                ) : isActivelyEditing ? (
                  // Active inline input/select editor
                  <div className="flex items-center gap-1.5 w-full">
                    {type === "select" ? (
                      <select
                        value={currentVal ?? ""}
                        onChange={(e) => handleFieldChange(key!, e.target.value)}
                        className="w-full rounded-lg border border-blue-500 bg-white px-2.5 py-1 text-xs sm:text-sm font-semibold text-slate-900 shadow-xs focus:border-blue-600 focus:outline-hidden dark:border-blue-500 dark:bg-slate-800 dark:text-slate-100"
                      >
                        <option value="">-- Select {label} --</option>
                        {/* Always include current saved value if missing from options */}
                        {currentVal && !options.some((o) => o.value === currentVal) && (
                          <option value={currentVal}>{currentVal} (Current)</option>
                        )}
                        {options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={type === "number" ? "number" : "text"}
                        value={currentVal ?? ""}
                        onChange={(e) => handleFieldChange(key!, e.target.value)}
                        placeholder={`Enter ${label}`}
                        className="w-full rounded-lg border border-blue-500 bg-white px-2.5 py-1 text-xs sm:text-sm font-semibold text-slate-900 shadow-xs focus:border-blue-600 focus:outline-hidden dark:border-blue-500 dark:bg-slate-800 dark:text-slate-100"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => toggleFieldEdit(key!)}
                      title="Done editing field"
                      className="rounded-lg bg-blue-600 p-1.5 text-white hover:bg-blue-700 shrink-0 shadow-xs transition cursor-pointer"
                    >
                      <Check size={14} />
                    </button>
                    {isModified && (
                      <button
                        type="button"
                        onClick={() => revertField(key!)}
                        title={`Revert ${label}`}
                        className="rounded-lg bg-rose-100 p-1.5 text-rose-700 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:hover:bg-rose-900 shrink-0 shadow-xs transition cursor-pointer"
                      >
                        <RotateCcw size={14} />
                      </button>
                    )}
                  </div>
                ) : (
                  // Edit mode is active, but this field has not been toggled to input yet
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className={isModified ? "font-bold text-blue-700 dark:text-blue-300" : ""}>
                        {currentVal || (value ?? "-")}
                      </span>
                      {isModified && (
                        <span className="inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                          Modified
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleFieldEdit(key!)}
                        title={`Edit ${label}`}
                        className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition cursor-pointer"
                      >
                        <Pencil size={13} />
                      </button>
                      {isModified && (
                        <button
                          type="button"
                          onClick={() => revertField(key!)}
                          title={`Revert ${label}`}
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                          <RotateCcw size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl bg-white dark:bg-[var(--bg)] p-3 text-slate-900 dark:text-slate-100 sm:p-6 print:max-w-none print:p-0">
      <header className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-2 pb-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-[#195b8e]"
        >
          <ArrowLeft size={17} /> Back
        </button>
        <div className="flex flex-wrap items-center gap-1">
          <button
            aria-label="View timeline"
            title="Timeline"
            onClick={() => document.getElementById("timeline")?.scrollIntoView({ behavior: "smooth" })}
            className="rounded-lg p-2 text-[#195b8e] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800"
          >
            <Clock size={21} />
          </button>
          <button
            aria-label="View history"
            title="History"
            onClick={() => document.getElementById("history")?.scrollIntoView({ behavior: "smooth" })}
            className="rounded-lg p-2 text-[#195b8e] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800"
          >
            <History size={21} />
          </button>
          <button
            aria-label="Print details"
            title="Print Details"
            onClick={() => window.print()}
            className="rounded-lg p-2 text-[#195b8e] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800"
          >
            <Printer size={21} />
          </button>
        </div>
      </header>

      {/* Success Notification Alert */}
      {actionSuccessMessage && (
        <div className="no-print mb-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm font-bold">{actionSuccessMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMessage(null)}
            className="rounded-lg p-1 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Pending Edit Request Banner */}
      {pendingEditRequest && (
        <div className="no-print mb-4 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 dark:border-amber-800/70 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white font-bold shadow-xs">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm sm:text-base font-extrabold text-amber-950 dark:text-amber-100">
                  Edit Request Already Pending Approval
                </p>
                <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 mt-0.5">
                  Requested by <strong className="font-bold">{pendingEditRequest.requestedBy || "User"}</strong> on{" "}
                  <strong>{formatDateTime(pendingEditRequest.requestedAt)}</strong>. Changes will apply upon approval in{" "}
                  <strong className="underline">Pending Approval &gt; Edit Request</strong>.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPendingModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3.5 py-1.5 text-xs font-bold text-amber-900 shadow-xs hover:bg-amber-100 dark:border-amber-700 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-amber-950/60 transition cursor-pointer"
            >
              <Eye size={14} /> View Proposed Changes
            </button>
          </div>
        </div>
      )}

      {/* Edit Mode Sticky Action Bar */}
      {isEditMode && (
        <div className="sticky top-3 z-30 no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-400 bg-blue-50/95 p-4 shadow-xl backdrop-blur-md dark:border-blue-700 dark:bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20">
              <Pencil size={18} />
            </div>
            <div>
              <p className="text-sm font-extrabold text-blue-950 dark:text-blue-100">
                Document Field-Level Editing Mode
              </p>
              <p className="text-xs text-blue-800 dark:text-blue-300">
                Click the pencil icon ✏️ beside any editable field to adjust its value.
                {modifiedFields.length > 0 ? (
                  <span className="ml-2 font-bold text-amber-600 dark:text-amber-400">
                    • {modifiedFields.length} field{modifiedFields.length > 1 ? "s" : ""} modified
                  </span>
                ) : (
                  <span className="ml-2 italic text-slate-500">No modifications yet</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              Cancel Edit
            </button>
            <button
              type="button"
              disabled={modifiedFields.length === 0 || isSubmitting}
              onClick={handleOpenSaveModal}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-bold text-white shadow-md transition ${
                modifiedFields.length === 0 || isSubmitting
                  ? "bg-slate-400 cursor-not-allowed opacity-60"
                  : "bg-blue-600 hover:bg-blue-700 cursor-pointer shadow-blue-500/20"
              }`}
            >
              <CheckCircle2 size={15} />
              Save Edit {modifiedFields.length > 0 ? `(${modifiedFields.length})` : ""}
            </button>
          </div>
        </div>
      )}

      {/* Main Document Details Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-2 py-3 print:mb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-extrabold uppercase text-slate-950 dark:text-slate-100 sm:text-xl">
            Track No : {reg.trackingNumber}
          </h1>
          {canEdit && (
            <button
              type="button"
              onClick={toggleEditMode}
              className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold transition shadow-xs cursor-pointer ${
                isEditMode
                  ? "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700"
                  : "bg-blue-50 text-[#195b8e] border border-blue-200 hover:bg-blue-100 dark:bg-slate-800 dark:text-blue-400 dark:border-slate-700 dark:hover:bg-slate-700"
              }`}
              title={isEditMode ? "Exit editing mode" : "Edit document details"}
            >
              <Pencil size={13} className={isEditMode ? "animate-pulse" : ""} />
              <span>{isEditMode ? "Editing Active" : "Edit Document"}</span>
            </button>
          )}
        </div>
        <p className={`text-base font-extrabold sm:text-lg ${statusClass(currentStatus)}`}>
          Status :: {currentStatus}
        </p>
      </div>

      <div className="space-y-5 print:space-y-4">
        {linkedDocuments.length > 1 && (
          <div className="no-print rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                Documents Linked to This Customer ({linkedDocuments.length})
              </span>
              <span className="text-xs text-blue-700 dark:text-blue-400">
                Click a tracking number to switch documents
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {linkedDocuments.map((doc: any) => {
                const isCurrent = doc.trackingNumber === reg.trackingNumber;
                return (
                  <Link
                    key={doc.id || doc.trackingNumber}
                    href={`/dashboard/document-details/${encodeURIComponent(doc.trackingNumber)}`}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition ${
                      isCurrent
                        ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-400"
                        : "border border-blue-200 bg-white text-blue-700 hover:bg-blue-100 hover:border-blue-300 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-blue-900/40"
                    }`}
                  >
                    <span>{doc.trackingNumber}</span>
                    {doc.documentType && (
                      <span
                        className={`text-[10px] font-normal ${
                          isCurrent ? "text-blue-100" : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        ({doc.documentType})
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Section A: Document Type */}
        <Section title="Document Type">
          {renderFieldGrid([
            {
              key: "documentType",
              label: "Document Type",
              value: reg.documentType,
              editable: true,
              type: "select",
              options: documentTypeOptions,
            },
            {
              key: "processType",
              label: "Process Type",
              value: reg.processType,
              editable: true,
              type: "select",
              options: processTypeOptions,
            },
            {
              key: "committedDuration",
              label: "Committed Duration / SLA",
              value: reg.committedDuration,
              editable: true,
              type: "number",
            },
            {
              key: "priority",
              label: "Priority",
              value: reg.priority || "Normal",
              editable: true,
              type: "select",
              options: PRIORITY_OPTIONS,
            },
            {
              key: "customerType",
              label: "Customer Type",
              value: reg.customerType || "Individual",
              editable: true,
              type: "select",
              options: CUSTOMER_TYPE_OPTIONS,
            },
            {
              key: "documentIssuedCountry",
              label: "Issued Country",
              value: reg.documentIssuedCountry,
              editable: true,
              type: "select",
              options: countryOptions,
            },
            {
              key: "deliveryLocation",
              label: "Delivery Location",
              value: reg.deliveryLocation,
              editable: true,
              type: "select",
              options: officeOptions,
            },
            {
              key: "externalProcess",
              label: "Additional Process",
              value: reg.externalProcess,
              editable: true,
              type: "text",
            },
            { label: "Current Office", value: proc.currentOffice },
            { label: "Current Stage", value: proc.currentStage },
            { label: "Current Status", value: currentStatus },
            { label: "Current Sub Package", value: proc.currentSubPackage || "-" },
          ])}
        </Section>

        {/* Section B: Document Details */}
        <Section title="Document Details">
          {renderFieldGrid([
            {
              key: "documentName",
              label: "Document Name",
              value: reg.documentName,
              editable: true,
              type: "text",
            },
            {
              key: "documentType",
              label: "Document Type",
              value: reg.documentType,
              editable: true,
              type: "select",
              options: documentTypeOptions,
            },
            {
              key: "processType",
              label: "Process Type",
              value: reg.processType,
              editable: true,
              type: "select",
              options: processTypeOptions,
            },
            {
              key: "documentIssuedCountry",
              label: "Issued Country",
              value: reg.documentIssuedCountry,
              editable: true,
              type: "select",
              options: countryOptions,
            },
            {
              key: "externalProcess",
              label: "Additional Process",
              value: reg.externalProcess,
              editable: true,
              type: "text",
            },
            {
              key: "subPackage",
              label: "Sub Package",
              value: reg.subPackage || "-",
              editable: true,
              type: "select",
              options: subPackageOptions,
            },
            { label: "Registered Date", value: formatDate(reg.createdAt) },
            { label: "Region of Registration", value: reg.regionOfRegistration },
            {
              key: "registeredPerson",
              label: "Registered By",
              value: reg.registeredPerson || formatAuditUser(reg.createdByName || reg.createdBy, "System"),
              editable: true,
              type: "text",
            },
            {
              key: "collectedPerson",
              label: "Collected By",
              value: reg.collectedPerson,
              editable: true,
              type: "text",
            },
          ])}
        </Section>

        {/* Section C: Customer Information */}
        <Section title="Customer Information">
          {renderFieldGrid([
            {
              key: "customerName",
              label: "Customer Name",
              value: reg.customerName,
              editable: true,
              type: "text",
            },
            {
              key: "mobile",
              label: "Mobile",
              value: reg.mobile,
              editable: true,
              type: "text",
            },
            {
              key: "email",
              label: "Email",
              value: reg.email,
              editable: true,
              type: "text",
            },
            {
              key: "country",
              label: "Country",
              value: reg.country,
              editable: true,
              type: "select",
              options: countryOptions,
            },
            {
              key: "address",
              label: "Address",
              value: reg.address,
              editable: true,
              type: "text",
            },
            {
              key: "customerType",
              label: "Customer Type",
              value: reg.customerType || "Individual",
              editable: true,
              type: "select",
              options: CUSTOMER_TYPE_OPTIONS,
            },
            {
              key: "state",
              label: "State",
              value: reg.state,
              editable: true,
              type: "text",
            },
            {
              key: "city",
              label: "City",
              value: reg.city,
              editable: true,
              type: "text",
            },
          ])}
        </Section>

        {/* Section D: Corporate Details */}
        {reg.customerType === "Corporate" && reg.corporateDetail && (
          <Section title="Corporate Details">
            {renderFieldGrid([
              { label: "Corporate Name", value: reg.corporateDetail.companyName },
              { label: "Contact Person", value: reg.corporateDetail.contactPersonName },
              { label: "Mobile", value: reg.corporateDetail.contactPersonMobile },
              { label: "Email", value: reg.corporateDetail.email },
              { label: "Address", value: reg.corporateDetail.address },
              {
                label: "Agreement File",
                value: reg.corporateDetail.agreementFile?.url ? (
                  <span className="inline-flex gap-3">
                    <a
                      className="text-[#195b8e] dark:text-blue-400 hover:underline"
                      href={reg.corporateDetail.agreementFile.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View
                    </a>
                    <a
                      className="text-[#195b8e] dark:text-blue-400 hover:underline"
                      href={reg.corporateDetail.agreementFile.url}
                      download
                    >
                      Download
                    </a>
                  </span>
                ) : (
                  "-"
                ),
              },
            ])}
          </Section>
        )}

        {/* Payment Details Section */}
        <Section title="Payment Details">{renderFieldGrid(paymentFields)}</Section>

        {/* Supporting Documents */}
        {reg.files?.length > 0 && (
          <Section title="Supporting Documents">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {reg.files.map((file: any) => {
                const storage = file.fileStorage || {};
                const url = storage.url;
                return (
                  <div
                    key={file.id}
                    className="flex items-center justify-between gap-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 p-3"
                  >
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {file.fileCategory || "Supporting Document"}
                    </p>
                    {url && (
                      <div className="no-print flex gap-2">
                        <a
                          title="View file"
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm font-bold text-[#195b8e] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700"
                        >
                          <Eye size={16} /> View
                        </a>
                        <a
                          title="Download file"
                          href={url}
                          download
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm font-bold text-[#195b8e] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700"
                        >
                          <Download size={16} /> Download
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Current Process */}
        <Section title="Current Process">
          {renderFieldGrid([
            { label: "Current Office", value: proc.currentOffice },
            { label: "Current Department", value: proc.currentDepartment },
            { label: "Current Package", value: proc.currentPackage },
            { label: "Current Sub Package", value: proc.currentSubPackage || "-" },
            { label: "Current Assigned User", value: proc.currentHandler },
            { label: "Current Status", value: currentStatus },
            { label: "Current Stage", value: proc?.currentStage },
            { label: "Number of Days", value: `${proc?.daysCount ?? 0} Days` },
          ])}
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-300">
              Activity Status
            </h3>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full min-w-125 text-left text-sm">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-xs uppercase text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-3">Activity</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {(proc.activities || []).length ? (
                    proc.activities.map((activity: any) => (
                      <tr key={activity.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">{activity.name}</td>
                        <td className={`p-3 font-bold ${statusClass(activity.status)}`}>{activity.status}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">
                          {activity.date ? formatDate(activity.date) : "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="p-3 text-slate-500 dark:text-slate-400">
                        No activities are configured for this process type.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Section>

        {/* Advance Payment History & Approvals */}
        <Section title="Advance Payment History & Approvals">
          <AdvanceHistoryTable history={advancePaymentApprovals} onRefresh={fetchDetails} />
        </Section>

        {/* Payment Receipts & Documents */}
        {reg.paymentUpdates?.length > 0 && (
          <Section title="Payment Receipts & Documents">
            <div className="space-y-3">
              {reg.paymentUpdates.map((update: any) => (
                <div
                  key={update.id}
                  className="flex flex-wrap items-center justify-between gap-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 p-3"
                >
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">
                      Invoice #{update.invoiceNumber} — ₹{Number(update.amountPaid).toFixed(2)}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {update.paymentMode} · {formatDate(update.submittedAt)}
                    </p>
                  </div>
                  {update.receiptFileUrl && (
                    <div className="no-print flex gap-2">
                      <a
                        href={update.receiptFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#195b8e] dark:text-blue-400 hover:underline"
                      >
                        View
                      </a>
                      <a
                        href={update.receiptFileUrl}
                        download
                        className="text-[#195b8e] dark:text-blue-400 hover:underline"
                      >
                        Download
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Movement Timeline */}
        <Section title="Document Movement Timeline" id="timeline">
          {workflowHistory.length ? (
            <div className="space-y-3">
              {workflowHistory.map((step: any) => (
                <div key={step.id} className="border-l-4 border-[#195b8e] pl-4">
                  <div className="flex flex-wrap justify-between gap-2 font-bold text-slate-900 dark:text-slate-100">
                    <span>{step.workflowStep || step.status}</span>
                    <span className="text-slate-500 dark:text-slate-400">{formatDateTime(step.performedAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                    {step.remarks || "No remarks logged."}
                  </p>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Performed by: {step.performedBy || "System"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 dark:text-slate-400">No workflow timeline recorded.</p>
          )}
        </Section>

        {/* Movement History */}
        <Section title="Document Movement History" id="history">
          {movementHistory.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-175 text-left text-sm">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-xs uppercase text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-3">Date & Time</th>
                    <th className="p-3">From Office</th>
                    <th className="p-3">To Office</th>
                    <th className="p-3">User</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {movementHistory.map((mov: any) => (
                    <tr key={mov.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-3 text-slate-900 dark:text-slate-100">{formatDateTime(mov.performedAt)}</td>
                      <td className="p-3">
                        {mov.fromOffice?.name || mov.fromOffice?.officeName || mov.oldOffice || "-"}
                      </td>
                      <td className="p-3">
                        {mov.toOffice?.name || mov.toOffice?.officeName || mov.newOffice || "-"}
                      </td>
                      <td className="p-3">{mov.performedBy || "-"}</td>
                      <td className="p-3 font-semibold">{mov.action}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">{mov.remarks || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-500 dark:text-slate-400">No movement history entries.</p>
          )}
        </Section>

        {/* Approval Information */}
        <Section title="Approval Information">
          {renderFieldGrid([
            { label: "Approval Status", value: reg.approvalStatus },
            { label: "Approved By", value: reg.approvedBy },
            { label: "Approved Date", value: reg.approvedAt ? formatDateTime(reg.approvedAt) : "-" },
            { label: "Rejection Reason", value: reg.rejectionReason },
            { label: "Finance Approval Status", value: reg.financeApprovalStatus },
            { label: "Payment Update Status", value: reg.paymentUpdateStatus },
          ])}
        </Section>

        {/* Audit Information */}
        <Section title="Audit Information">
          {renderFieldGrid([
            { label: "Created By", value: formatAuditUser(reg.createdByName || reg.createdBy) },
            { label: "Created Date", value: formatDateTime(reg.createdAt) },
            {
              label: "Updated By",
              value: formatAuditUser(reg.updatedByName || reg.updatedBy || reg.createdByName || reg.createdBy),
            },
            { label: "Updated Date", value: formatDateTime(reg.updatedAt) },
          ])}
        </Section>
      </div>

      {/* Save Edit Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20">
                    <FileEdit className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Confirm Document Edit Request
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Tracking Number:{" "}
                      <strong className="font-mono text-blue-600 dark:text-blue-400">{reg.trackingNumber}</strong> •{" "}
                      {modifiedFields.length} field{modifiedFields.length > 1 ? "s" : ""} modified
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isSubmitting}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
                <p className="font-semibold">
                  Submitting this request will not directly update the document. It creates an approval request under{" "}
                  <strong>Pending Approval &gt; Edit Request</strong>. Changes take effect once an authorized approver approves them.
                </p>
              </div>

              {submitError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p className="font-bold">{submitError}</p>
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 uppercase text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="p-3 font-extrabold">Field</th>
                      <th className="p-3 font-extrabold">Current Value</th>
                      <th className="p-3 font-extrabold">Requested Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {modifiedFields.map((item) => (
                      <tr key={item.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{item.label}</td>
                        <td className="p-3 text-slate-500 dark:text-slate-400 line-through decoration-rose-500/60">
                          {item.oldValue}
                        </td>
                        <td className="p-3 font-bold text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/20">
                          {item.newValue}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Remarks / Reason for Modification (Optional)
                </label>
                <textarea
                  rows={2}
                  value={userRemarks}
                  onChange={(e) => setUserRemarks(e.target.value)}
                  placeholder="Provide context or explanation for the approver..."
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-3.5 dark:border-slate-800 dark:bg-slate-800/40">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitEditRequest}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-60 transition cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Submitting Request...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} /> Submit Edit Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Request Details Modal ("View Proposed Changes") */}
      {showPendingModal && pendingEditRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 bg-amber-50/80 px-6 py-4 dark:border-slate-800 dark:bg-amber-950/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white font-bold shadow-md shadow-amber-500/20">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-amber-950 dark:text-amber-100">
                      Pending Edit Approval Request
                    </h3>
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      Tracking Number:{" "}
                      <strong className="font-mono">{pendingEditRequest.trackingNumber}</strong> • Requested by{" "}
                      <strong>{pendingEditRequest.requestedBy}</strong> on{" "}
                      {formatDateTime(pendingEditRequest.requestedAt)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPendingModal(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                <p className="font-semibold">
                  This document already has an active edit request awaiting review in{" "}
                  <strong>Pending Approval &gt; Edit Request</strong>. A new request cannot be submitted until this request
                  is approved or rejected.
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 uppercase text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="p-3 font-extrabold">Field</th>
                      <th className="p-3 font-extrabold">Original Value</th>
                      <th className="p-3 font-extrabold">Proposed Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {Array.isArray(pendingEditRequest.fieldChanges) && pendingEditRequest.fieldChanges.length > 0 ? (
                      pendingEditRequest.fieldChanges.map((change: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                            {change.fieldLabel || change.field}
                          </td>
                          <td className="p-3 text-slate-500 dark:text-slate-400">{change.oldValue ?? "-"}</td>
                          <td className="p-3 font-bold text-amber-700 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
                            {change.newValue ?? "-"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="p-3 text-center text-slate-500">
                          No itemized field changes recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50 px-6 py-3.5 dark:border-slate-800 dark:bg-slate-800/40">
              <button
                type="button"
                onClick={() => setShowPendingModal(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
