"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  FileCheck2,
  Layers,
  Mail,
  MapPin,
  Phone,
  Plus,
  Save,
  Trash2,
  User,
} from "lucide-react";
import { Country } from "country-state-city";

import { MultiFileUpload } from "@/components/common/FileUpload";
import { SearchableSelect, type SelectOption } from "@/components/ui/SearchableSelect";
import { Button } from "@/components/ui/Button";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { Input } from "@/components/ui/Input";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import type { RegistrationBatchResponse } from "@/features/registration/types/registration.types";

export type BatchDocumentDraft = {
  draftId: string;
  trackingNumber: string;
  documentType: string;
  documentName: string;
  documentIssuedCountry: string;
  processType: string;
  subPackage: string;
  externalProcess: string;
  priority: string;
  committedDuration: string;
  deliveryLocation: string;
  totalCharges: string;
  advancePaid: string;
  requestedAdvanceAmount: string;
  paymentMode: string;
  upiTransactionId: string;
  bankName: string;
  transactionRefNo: string;
  transferDate: string;
  chequeNumber: string;
  chequeDate: string;
  ddNumber: string;
  ddDate: string;
  cardLast4: string;
  approvalCode: string;
  paymentGateway: string;
  onlineTransactionId: string;
  walletName: string;
  walletTransactionId: string;
  paymentReferenceNo: string;
  paymentDescription: string;
  collectedPerson: string;
  commissionToUserId: string;
  commissionToName: string;
  commissionToEmail: string;
  documentFileIds: string[];
  invoiceFileIds: string[];
  supportingFileIds: string[];
  advancePaymentFileIds: string[];
};

interface RegistrationBatchManagerProps {
  leadId: string;
  currentOfficeLocationName: string;
}

export function RegistrationBatchManager({
  leadId,
  currentOfficeLocationName,
}: RegistrationBatchManagerProps) {
  const router = useRouter();

  const [lead, setLead] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdResult, setCreatedResult] = useState<RegistrationBatchResponse | null>(null);

  // Master data options
  const [documentTypeOptions, setDocumentTypeOptions] = useState<SelectOption[]>([]);
  const [processTypeOptions, setProcessTypeOptions] = useState<SelectOption[]>([]);
  const [paymentModeOptions, setPaymentModeOptions] = useState<string[]>([]);
  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  const [officeLocationOptions, setOfficeLocationOptions] = useState<string[]>([]);
  const [personOptions, setPersonOptions] = useState<string[]>([]);
  const [commissionUserOptions, setCommissionUserOptions] = useState<SelectOption[]>([]);

  const [drafts, setDrafts] = useState<BatchDocumentDraft[]>([]);

  const priorityOptions = useMemo(
    () => [
      { label: "Normal", value: "Normal" },
      { label: "Express", value: "Express" },
      { label: "Super Fast", value: "Super Fast" },
    ],
    [],
  );

  const allMasterCountries = useMemo(() => {
    const list = Country.getAllCountries().map((c) => c.name);
    const combined = Array.from(new Set([...list, ...countryOptions]));
    return combined.sort((a, b) => a.localeCompare(b));
  }, [countryOptions]);

  const countrySelectOptions = useMemo(
    () => allMasterCountries.map((c) => ({ label: c, value: c })),
    [allMasterCountries],
  );

  const createBlankDraft = useCallback(
    (leadData?: any): BatchDocumentDraft => ({
      draftId: crypto.randomUUID(),
      trackingNumber: "",
      documentType: leadData?.docType || "",
      documentName: leadData?.documentName || "",
      documentIssuedCountry: leadData?.documentIssuedCountry || leadData?.country || "",
      processType: leadData?.service || "",
      subPackage: "",
      externalProcess: "",
      priority: "Normal",
      committedDuration: leadData?.workingDays ? `${leadData.workingDays} days` : "",
      deliveryLocation: currentOfficeLocationName || "",
      totalCharges: "",
      advancePaid: "",
      requestedAdvanceAmount: "",
      paymentMode: "Cash",
      upiTransactionId: "",
      bankName: "",
      transactionRefNo: "",
      transferDate: "",
      chequeNumber: "",
      chequeDate: "",
      ddNumber: "",
      ddDate: "",
      cardLast4: "",
      approvalCode: "",
      paymentGateway: "",
      onlineTransactionId: "",
      walletName: "",
      walletTransactionId: "",
      paymentReferenceNo: "",
      paymentDescription: "",
      collectedPerson: "",
      commissionToUserId: "",
      commissionToName: "",
      commissionToEmail: "",
      documentFileIds: [],
      invoiceFileIds: [],
      supportingFileIds: [],
      advancePaymentFileIds: [],
    }),
    [currentOfficeLocationName],
  );

  // Load Lead and Master Data
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError("");

    async function loadData() {
      try {
        const leadRes = await fetch(`/api/leads/${leadId}`);
        const leadJson = await leadRes.json();
        if (!leadRes.ok || !leadJson.lead) {
          throw new Error(leadJson.message || "Lead not found or unauthorized.");
        }

        const loadedLead = leadJson.lead;
        if (isMounted) {
          setLead(loadedLead);

          const initialCount =
            loadedLead.noOfDocuments && Number(loadedLead.noOfDocuments) > 0
              ? Number(loadedLead.noOfDocuments)
              : 1;

          const initialDrafts: BatchDocumentDraft[] = Array.from(
            { length: initialCount },
            () => createBlankDraft(loadedLead),
          );
          setDrafts(initialDrafts);
        }

        // Fetch master dropdowns
        const [docTypesRes, procTypesRes, payModesRes, countriesRes, officesRes, usersRes] =
          await Promise.allSettled([
            fetch("/api/master-data/document-types?active=true").then((r) => r.json()),
            fetch("/api/master-data/process-types?active=true").then((r) => r.json()),
            fetch("/api/master-data/payment-mode?status=Active&pageSize=200").then((r) => r.json()),
            fetch("/api/master-data/countries?active=true").then((r) => r.json()),
            fetch("/api/office-locations", { cache: "no-store" }).then((r) => r.json()),
            fetch("/api/users?active=true", { cache: "no-store" }).then((r) => r.json()),
          ]);

        if (isMounted) {
          if (docTypesRes.status === "fulfilled" && docTypesRes.value.items) {
            setDocumentTypeOptions(
              docTypesRes.value.items.map((i: any) => ({ label: i.name, value: i.name })),
            );
          }
          if (procTypesRes.status === "fulfilled" && procTypesRes.value.items) {
            setProcessTypeOptions(
              procTypesRes.value.items.map((i: any) => ({ label: i.name, value: i.name })),
            );
          }
          if (payModesRes.status === "fulfilled" && payModesRes.value.items) {
            const names = payModesRes.value.items
              .map((i: any) => i.paymentModeName || i.name)
              .filter(Boolean);
            setPaymentModeOptions(
              names.length > 0 ? names : ["Cash", "Bank Transfer", "Credit Card", "Cheque", "Online"],
            );
          } else {
            setPaymentModeOptions(["Cash", "Bank Transfer", "Credit Card", "Cheque", "Online"]);
          }
          if (countriesRes.status === "fulfilled" && countriesRes.value.items) {
            setCountryOptions(countriesRes.value.items.map((i: any) => i.name));
          }
          if (officesRes.status === "fulfilled" && officesRes.value.officeLocations) {
            const names = officesRes.value.officeLocations
              .map((o: any) => o.officeName)
              .filter(Boolean);
            setOfficeLocationOptions(Array.from(new Set(names)));
          }
          if (usersRes.status === "fulfilled" && usersRes.value.users) {
            const users = usersRes.value.users;
            const names = users.map((u: any) => u.name || u.email || "").filter(Boolean);
            setPersonOptions(Array.from(new Set(names)));
            setCommissionUserOptions(
              users.map((u: any) => ({
                label: u.name || u.email || "User",
                value: u.id,
                description: u.email || undefined,
              })),
            );
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to load lead context.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [leadId, createBlankDraft]);

  const updateDraft = (draftId: string, updates: Partial<BatchDocumentDraft>) => {
    setDrafts((prev) =>
      prev.map((d) => (d.draftId === draftId ? { ...d, ...updates } : d)),
    );
  };

  const handleAddDocument = () => {
    setDrafts((prev) => [...prev, createBlankDraft(lead)]);
  };

  const handleRemoveDocument = (draftId: string) => {
    setDrafts((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((d) => d.draftId !== draftId);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!drafts.length) {
      setError("Please add at least one document to register.");
      return;
    }

    // 1. Client-side tracking number validations
    const seen = new Set<string>();
    for (let index = 0; index < drafts.length; index++) {
      const draft = drafts[index];
      const tracking = draft.trackingNumber.trim();
      if (!tracking) {
        setError(`Document #${index + 1}: Tracking number is required.`);
        return;
      }
      const lower = tracking.toLowerCase();
      if (seen.has(lower)) {
        setError(
          `Document #${index + 1}: Tracking number "${draft.trackingNumber}" is duplicated in this batch.`,
        );
        return;
      }
      seen.add(lower);

      const total = Number(draft.totalCharges || 0);
      const adv = Number(draft.requestedAdvanceAmount || draft.advancePaid || 0);
      if (adv > total) {
        setError(`Document #${index + 1}: Advance payment cannot exceed Total Charges.`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const payload = {
        leadId,
        documents: drafts.map((d) => ({
          draftId: d.draftId,
          trackingNumber: d.trackingNumber.trim(),
          documentType: d.documentType,
          documentName: d.documentName,
          documentIssuedCountry: d.documentIssuedCountry,
          processType: d.processType,
          subPackage: d.subPackage,
          externalProcess: d.externalProcess,
          priority: d.priority,
          committedDuration: d.committedDuration,
          deliveryLocation: d.deliveryLocation || currentOfficeLocationName,
          totalCharges: Number(d.totalCharges || 0),
          advancePaid: Number(d.requestedAdvanceAmount || d.advancePaid || 0),
          requestedAdvanceAmount: Number(d.requestedAdvanceAmount || d.advancePaid || 0),
          paymentMode: d.paymentMode,
          upiTransactionId: d.upiTransactionId,
          bankName: d.bankName,
          transactionRefNo: d.transactionRefNo,
          transferDate: d.transferDate,
          chequeNumber: d.chequeNumber,
          chequeDate: d.chequeDate,
          ddNumber: d.ddNumber,
          ddDate: d.ddDate,
          cardLast4: d.cardLast4,
          approvalCode: d.approvalCode,
          paymentGateway: d.paymentGateway,
          onlineTransactionId: d.onlineTransactionId,
          walletName: d.walletName,
          walletTransactionId: d.walletTransactionId,
          paymentReferenceNo: d.paymentReferenceNo,
          paymentDescription: d.paymentDescription,
          collectedPerson: d.collectedPerson,
          commissionToUserId: d.commissionToUserId,
          commissionToName: d.commissionToName,
          commissionToEmail: d.commissionToEmail,
        })),
      };

      const response = await fetch("/api/registrations/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to create registration batch.");
      }

      // 2. Associate files per returned Registration ID
      for (const regItem of data.registrations ?? []) {
        const matchingDraft = drafts.find((d) => d.draftId === regItem.draftId);
        if (matchingDraft) {
          const filesToAssociate: { fileStorageId: string; category: string }[] = [];
          matchingDraft.documentFileIds.forEach((id) =>
            filesToAssociate.push({ fileStorageId: id, category: "DOCUMENT" }),
          );
          matchingDraft.invoiceFileIds.forEach((id) =>
            filesToAssociate.push({ fileStorageId: id, category: "INVOICE" }),
          );
          matchingDraft.supportingFileIds.forEach((id) =>
            filesToAssociate.push({ fileStorageId: id, category: "SUPPORTING_DOCUMENT" }),
          );
          matchingDraft.advancePaymentFileIds.forEach((id) =>
            filesToAssociate.push({ fileStorageId: id, category: "ADVANCE_PAYMENT" }),
          );

          for (const item of filesToAssociate) {
            await fetch(`/api/registrations/${regItem.id}/files`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ fileStorageId: item.fileStorageId, fileCategory: item.category }),
            }).catch(console.error);
          }
        }
      }

      setCreatedResult(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <LoadingSkeleton className="h-10 w-64 rounded-xl" />
        <LoadingSkeleton className="h-44 w-full rounded-2xl" />
        <LoadingSkeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (createdResult) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <DashboardCard className="border border-emerald-200 bg-white dark:border-emerald-900/50 dark:bg-slate-900 p-8 text-center shadow-lg">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400">
            <CheckCircle2 size={36} />
          </div>

          <h2 className="mt-4 text-2xl font-bold text-slate-900 dark:text-slate-100">
            Registration Batch Created
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Batch Reference:{" "}
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {createdResult.batch.batchNumber}
            </span>
          </p>
          <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            {createdResult.registrations.length} independent Revenue Registration document
            {createdResult.registrations.length > 1 ? "s" : ""} registered successfully.
          </p>

          <div className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-slate-50/60 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950/50 text-left">
            {createdResult.registrations.map((reg, idx) => (
              <div
                key={reg.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4 transition hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-slate-400">
                      Tracking Number
                    </div>
                    <Link
                      href={`/dashboard/revenue-registration?trackingNumber=${encodeURIComponent(reg.trackingNumber)}`}
                      className="font-mono font-bold text-emerald-600 hover:underline dark:text-emerald-400"
                    >
                      {reg.trackingNumber}
                    </Link>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/revenue-registration?trackingNumber=${encodeURIComponent(reg.trackingNumber)}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <FileCheck2 size={13} />
                    View Registration
                  </Link>
                  <Link
                    href={`/dashboard/document-details/${encodeURIComponent(reg.trackingNumber)}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    Document Details
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={`/dashboard/revenue-registration?batchId=${encodeURIComponent(createdResult.batch.batchNumber)}`}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
            >
              <FileCheck2 size={16} />
              View Batch in Revenue Table
            </Link>
            <Link
              href="/dashboard/leads/closed"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <ArrowLeft size={16} />
              Back to Closed Leads
            </Link>
          </div>
        </DashboardCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <Layers size={14} />
            <span>Multi-Document Batch Registration</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            New Registration
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Register multiple independent documents for this Closed Lead in one session.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/dashboard/leads/closed")}
          >
            <ArrowLeft size={15} /> Cancel
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div className="font-semibold">{error}</div>
        </div>
      )}

      {/* Shared Customer & Lead Context (Rendered ONCE) */}
      <DashboardCard
        title="Customer Information"
        description="Shared customer context from Closed Lead"
        className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
              <User size={13} /> Customer Name
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
              {lead?.firstName} {lead?.lastName}
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
              <Phone size={13} /> Mobile
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
              {lead?.countryCode} {lead?.mobileNumber}
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
              <Mail size={13} /> Email
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {lead?.email || "—"}
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
              <MapPin size={13} /> Country & State
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
              {lead?.country} {lead?.state ? `(${lead.state})` : ""}
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
              <Building2 size={13} /> Customer Type
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
              {lead?.clientType || "Individual"}
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
              <FileCheck2 size={13} /> Lead Code
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
              {lead?.leadCode}
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
              <Layers size={13} /> Expected Docs
            </div>
            <div className="mt-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {lead?.noOfDocuments || 1} Document(s)
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-400">
              <MapPin size={13} /> Registration Office
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
              {currentOfficeLocationName || "Office"}
            </div>
          </div>
        </div>
      </DashboardCard>

      {/* Form with Independent Document Cards */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
            Documents ({drafts.length})
          </h2>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAddDocument}
            className="flex items-center gap-1.5"
          >
            <Plus size={15} /> Add Another Document
          </Button>
        </div>

        {drafts.map((draft, index) => {
          const duplicateInBatch = drafts.some(
            (other) =>
              other.draftId !== draft.draftId &&
              other.trackingNumber.trim() !== "" &&
              other.trackingNumber.trim().toLowerCase() === draft.trackingNumber.trim().toLowerCase(),
          );

          const total = Number(draft.totalCharges || 0);
          const advance = Number(draft.requestedAdvanceAmount || draft.advancePaid || 0);
          const balance = Math.max(0, total - advance);

          const mode = (draft.paymentMode || "").trim().toLowerCase();
          const isUpi = mode === "upi";
          const isBank = mode.includes("bank") || mode === "bank transfer";
          const isCheque = mode === "cheque" || mode === "check";
          const isDD = mode.includes("demand draft") || mode === "dd";
          const isCard =
            mode === "credit card" ||
            mode === "debit card" ||
            mode.includes("credit") ||
            mode.includes("debit");
          const isOnline = mode.includes("online") || mode === "online payment";
          const isWallet = mode === "wallet";
          const isOther = mode === "other";

          return (
            <DashboardCard
              key={draft.draftId}
              className="border-2 border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 font-extrabold text-white text-sm shadow-xs">
                    #{index + 1}
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100">
                      Document #{index + 1}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Independent tracking, workflow, files, and payment
                    </p>
                  </div>
                </div>

                {drafts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveDocument(draft.draftId)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 transition hover:text-rose-700 dark:text-rose-400"
                  >
                    <Trash2 size={14} /> Remove Document
                  </button>
                )}
              </div>

              <div className="mt-5 space-y-6">
                {/* 1. Tracking Number & Core Document Specs */}
                <div>
                  <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Section 1: Document Details
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <Input
                        label="Tracking Number"
                        value={draft.trackingNumber}
                        placeholder="e.g. 7854"
                        required
                        onChange={(e) =>
                          updateDraft(draft.draftId, { trackingNumber: e.target.value })
                        }
                        className={
                          duplicateInBatch
                            ? "border-rose-500 focus:border-rose-500 focus:ring-rose-200"
                            : ""
                        }
                      />
                      {duplicateInBatch && (
                        <p className="mt-1 text-xs font-semibold text-rose-600">
                          Tracking Number already used in another document card.
                        </p>
                      )}
                    </div>

                    <label className="grid gap-2">
                      <span className="text-sm font-bold">Document Type</span>
                      <SearchableSelect
                        value={draft.documentType}
                        options={documentTypeOptions}
                        onChange={(val: string) => updateDraft(draft.draftId, { documentType: val })}
                        placeholder="Select Document Type"
                      />
                    </label>

                    <Input
                      label="Document Name"
                      value={draft.documentName}
                      placeholder="e.g. Degree Certificate"
                      onChange={(e) =>
                        updateDraft(draft.draftId, { documentName: e.target.value })
                      }
                    />

                    <label className="grid gap-2">
                      <span className="text-sm font-bold">Document Issued Country</span>
                      <SearchableSelect
                        value={draft.documentIssuedCountry}
                        options={countrySelectOptions}
                        onChange={(val: string) =>
                          updateDraft(draft.draftId, { documentIssuedCountry: val })
                        }
                        placeholder="Select Country"
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-bold">Process Type</span>
                      <SearchableSelect
                        value={draft.processType}
                        options={processTypeOptions}
                        onChange={(val: string) => updateDraft(draft.draftId, { processType: val })}
                        placeholder="Select Process Type"
                      />
                    </label>

                    <Input
                      label="Sub Package"
                      value={draft.subPackage}
                      placeholder="e.g. Standard"
                      onChange={(e) => updateDraft(draft.draftId, { subPackage: e.target.value })}
                    />

                    <Input
                      label="Additional / External Process"
                      value={draft.externalProcess}
                      placeholder="e.g. Notary Verification"
                      onChange={(e) =>
                        updateDraft(draft.draftId, { externalProcess: e.target.value })
                      }
                    />

                    <label className="grid gap-2">
                      <span className="text-sm font-bold">Priority</span>
                      <SearchableSelect
                        value={draft.priority}
                        options={priorityOptions}
                        onChange={(val: string) => updateDraft(draft.draftId, { priority: val })}
                        placeholder="Select Priority"
                      />
                    </label>

                    <Input
                      label="Committed Duration"
                      value={draft.committedDuration}
                      placeholder="e.g. 5 days"
                      onChange={(e) =>
                        updateDraft(draft.draftId, { committedDuration: e.target.value })
                      }
                    />

                    <label className="grid gap-2">
                      <span className="text-sm font-bold">Delivery Location</span>
                      <SearchableSelect
                        value={draft.deliveryLocation}
                        options={officeLocationOptions.map((o) => ({ label: o, value: o }))}
                        onChange={(val: string) =>
                          updateDraft(draft.draftId, { deliveryLocation: val })
                        }
                        placeholder="Select Delivery Location"
                      />
                    </label>
                  </div>

                  <div className="mt-4">
                    <MultiFileUpload
                      label="Customer Document Upload"
                      moduleName="Revenue Registration"
                      accept=".jpg,.jpeg,.png,.webp,.pdf,.docx,.xlsx"
                      onFilesChange={(ids) =>
                        updateDraft(draft.draftId, { documentFileIds: ids })
                      }
                      required={false}
                    />
                  </div>
                </div>

                {/* 2. Independent Payment Details */}
                <div className="border-t border-slate-100 pt-5 dark:border-slate-800">
                  <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Section 2: Payment Details
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Input
                      label="Total Charges (₹)"
                      type="number"
                      min="0"
                      step="0.01"
                      value={draft.totalCharges}
                      placeholder="0.00"
                      onChange={(e) =>
                        updateDraft(draft.draftId, { totalCharges: e.target.value })
                      }
                    />

                    <Input
                      label="Advance Payment (₹)"
                      type="number"
                      min="0"
                      step="0.01"
                      value={draft.requestedAdvanceAmount || draft.advancePaid}
                      placeholder="0.00"
                      onChange={(e) =>
                        updateDraft(draft.draftId, {
                          requestedAdvanceAmount: e.target.value,
                          advancePaid: e.target.value,
                        })
                      }
                    />

                    <Input
                      label="Balance Amount (₹)"
                      value={balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      readOnly
                      className="bg-slate-100 font-bold dark:bg-slate-800"
                    />

                    <label className="grid gap-2">
                      <span className="text-sm font-bold">Payment Mode</span>
                      <SearchableSelect
                        value={draft.paymentMode}
                        options={paymentModeOptions.map((m) => ({ label: m, value: m }))}
                        onChange={(val: string) => updateDraft(draft.draftId, { paymentMode: val })}
                        placeholder="Select Payment Mode"
                      />
                    </label>
                  </div>

                  {/* Conditional Payment Mode Fields */}
                  {isUpi && (
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Input
                        label="UPI Transaction ID"
                        value={draft.upiTransactionId}
                        placeholder="Enter UPI Transaction ID"
                        onChange={(e) =>
                          updateDraft(draft.draftId, { upiTransactionId: e.target.value })
                        }
                      />
                    </div>
                  )}

                  {isBank && (
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <Input
                        label="Bank Name"
                        value={draft.bankName}
                        placeholder="Enter Bank Name"
                        onChange={(e) => updateDraft(draft.draftId, { bankName: e.target.value })}
                      />
                      <Input
                        label="Transaction Ref No"
                        value={draft.transactionRefNo}
                        placeholder="Enter Reference Number"
                        onChange={(e) =>
                          updateDraft(draft.draftId, { transactionRefNo: e.target.value })
                        }
                      />
                      <Input
                        label="Transfer Date"
                        type="date"
                        value={draft.transferDate}
                        onChange={(e) =>
                          updateDraft(draft.draftId, { transferDate: e.target.value })
                        }
                      />
                    </div>
                  )}

                  {isCheque && (
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <Input
                        label="Cheque Number"
                        value={draft.chequeNumber}
                        placeholder="Enter Cheque Number"
                        onChange={(e) =>
                          updateDraft(draft.draftId, { chequeNumber: e.target.value })
                        }
                      />
                      <Input
                        label="Bank Name"
                        value={draft.bankName}
                        placeholder="Enter Bank Name"
                        onChange={(e) => updateDraft(draft.draftId, { bankName: e.target.value })}
                      />
                      <Input
                        label="Cheque Date"
                        type="date"
                        value={draft.chequeDate}
                        onChange={(e) =>
                          updateDraft(draft.draftId, { chequeDate: e.target.value })
                        }
                      />
                    </div>
                  )}

                  {isDD && (
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <Input
                        label="DD Number"
                        value={draft.ddNumber}
                        placeholder="Enter DD Number"
                        onChange={(e) => updateDraft(draft.draftId, { ddNumber: e.target.value })}
                      />
                      <Input
                        label="Bank Name"
                        value={draft.bankName}
                        placeholder="Enter Bank Name"
                        onChange={(e) => updateDraft(draft.draftId, { bankName: e.target.value })}
                      />
                      <Input
                        label="DD Date"
                        type="date"
                        value={draft.ddDate}
                        onChange={(e) => updateDraft(draft.draftId, { ddDate: e.target.value })}
                      />
                    </div>
                  )}

                  {isCard && (
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Input
                        label="Card Last 4 Digits"
                        value={draft.cardLast4}
                        placeholder="e.g. 4321"
                        maxLength={4}
                        onChange={(e) => updateDraft(draft.draftId, { cardLast4: e.target.value })}
                      />
                      <Input
                        label="Approval Code"
                        value={draft.approvalCode}
                        placeholder="Enter Approval Code"
                        onChange={(e) =>
                          updateDraft(draft.draftId, { approvalCode: e.target.value })
                        }
                      />
                    </div>
                  )}

                  {isOnline && (
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Input
                        label="Payment Gateway"
                        value={draft.paymentGateway}
                        placeholder="e.g. Razorpay"
                        onChange={(e) =>
                          updateDraft(draft.draftId, { paymentGateway: e.target.value })
                        }
                      />
                      <Input
                        label="Online Transaction ID"
                        value={draft.onlineTransactionId}
                        placeholder="Enter Online Transaction ID"
                        onChange={(e) =>
                          updateDraft(draft.draftId, { onlineTransactionId: e.target.value })
                        }
                      />
                    </div>
                  )}

                  {isWallet && (
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Input
                        label="Wallet Name"
                        value={draft.walletName}
                        placeholder="e.g. Paytm"
                        onChange={(e) => updateDraft(draft.draftId, { walletName: e.target.value })}
                      />
                      <Input
                        label="Wallet Transaction ID"
                        value={draft.walletTransactionId}
                        placeholder="Enter Transaction ID"
                        onChange={(e) =>
                          updateDraft(draft.draftId, { walletTransactionId: e.target.value })
                        }
                      />
                    </div>
                  )}

                  {isOther && (
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Input
                        label="Reference Number"
                        value={draft.paymentReferenceNo}
                        placeholder="Enter Reference Number"
                        onChange={(e) =>
                          updateDraft(draft.draftId, { paymentReferenceNo: e.target.value })
                        }
                      />
                      <Input
                        label="Description"
                        value={draft.paymentDescription}
                        placeholder="Enter Description"
                        onChange={(e) =>
                          updateDraft(draft.draftId, { paymentDescription: e.target.value })
                        }
                      />
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-sm font-bold">Collected Person</span>
                      <SearchableSelect
                        value={draft.collectedPerson}
                        options={personOptions.map((p) => ({ label: p, value: p }))}
                        onChange={(val: string) => updateDraft(draft.draftId, { collectedPerson: val })}
                        placeholder="Select Collected Person"
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-bold">Commission To</span>
                      <SearchableSelect
                        value={draft.commissionToUserId}
                        options={commissionUserOptions}
                        onChange={(val: string) => {
                          const userMatch = commissionUserOptions.find((u) => u.value === val);
                          updateDraft(draft.draftId, {
                            commissionToUserId: val,
                            commissionToName: userMatch?.label || "",
                            commissionToEmail: userMatch?.description || "",
                          });
                        }}
                        placeholder="Select User"
                      />
                    </label>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <MultiFileUpload
                      label="Bill / Invoice Upload"
                      moduleName="Revenue Registration"
                      accept=".jpg,.jpeg,.png,.webp,.pdf,.docx,.xlsx"
                      onFilesChange={(ids) =>
                        updateDraft(draft.draftId, { invoiceFileIds: ids })
                      }
                      required={false}
                    />

                    <MultiFileUpload
                      label="Supporting Documents Upload"
                      moduleName="Revenue Registration"
                      accept=".jpg,.jpeg,.png,.webp,.pdf,.docx,.xlsx"
                      onFilesChange={(ids) =>
                        updateDraft(draft.draftId, { supportingFileIds: ids })
                      }
                      required={false}
                    />
                  </div>

                  {advance > 0 && (
                    <div className="mt-4">
                      <MultiFileUpload
                        label="Advance Payment Receipt Upload"
                        moduleName="Revenue Registration"
                        accept=".jpg,.jpeg,.png,.webp,.pdf,.docx,.xlsx"
                        onFilesChange={(ids) =>
                          updateDraft(draft.draftId, { advancePaymentFileIds: ids })
                        }
                        required={false}
                      />
                    </div>
                  )}
                </div>
              </div>
            </DashboardCard>
          );
        })}

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6 dark:border-slate-800">
          <Button
            type="button"
            variant="secondary"
            onClick={handleAddDocument}
            className="flex items-center gap-1.5"
          >
            <Plus size={15} /> Add Another Document
          </Button>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/dashboard/leads/closed")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              <Save size={16} />
              {submitting
                ? "Registering Documents..."
                : `Save All (${drafts.length}) Registrations`}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
