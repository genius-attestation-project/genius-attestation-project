"use client";

import React, { useState, useEffect } from "react";
import { X, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { MultiFileUpload } from "@/components/common/MultiFileUpload";

type AdvanceApprovalModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: {
    id: string;
    trackingNumber: string;
    customerName: string;
    advanceAmount: number;
    paymentMode?: string;
  } | null;
};

export function AdvanceApprovalModal({
  open,
  onClose,
  onSuccess,
  item,
}: AdvanceApprovalModalProps) {
  const todayStr = new Date().toISOString().split("T")[0];

  const [bankProofFileIds, setBankProofFileIds] = useState<string[]>([]);
  const [approvalDate, setApprovalDate] = useState<string>(todayStr);
  const [remarks, setRemarks] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setBankProofFileIds([]);
      setApprovalDate(todayStr);
      setRemarks("");
      setError(null);
    }
  }, [open, todayStr]);

  if (!open || !item) return null;

  const isBankProofUploaded = bankProofFileIds.length > 0;
  const isDateSelected = Boolean(approvalDate.trim());
  const isRemarksEntered = Boolean(remarks.trim());

  const isFormValid = isBankProofUploaded && isDateSelected && isRemarksEntered;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isFormValid) {
      setError("Please provide Bank Proof, Date and Remarks before approving this advance payment.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/advance-payment-approvals/${item.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankProofFileId: bankProofFileIds[0],
          approvalDate,
          remarks: remarks.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || json.message || "Failed to approve advance payment.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="relative flex flex-col w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400">
              Advance Payment Approval · #{item.trackingNumber}
            </p>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              Approve Advance Payment
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customer: <span className="font-semibold text-slate-700 dark:text-slate-200">{item.customerName}</span> · Amount:{" "}
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                ₹{item.advanceAmount.toLocaleString()}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form id="approve-advance-form" onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Bank Proof Upload (Required) */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Bank Proof <span className="text-rose-500">*</span>
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
              Upload the company's bank/payment proof received for the advance payment.
            </p>
            <MultiFileUpload
              label=""
              moduleName="Advance Payment Bank Proof"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              onFilesChange={(ids) => setBankProofFileIds(ids)}
              required
            />
            {!isBankProofUploaded && (
              <p className="mt-1 text-[11px] text-rose-500">⚠ Bank Proof upload is required</p>
            )}
          </div>

          {/* 2. Date Field (Required) */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Date <span className="text-rose-500">*</span>
            </label>
            <Input
              label=""
              type="date"
              value={approvalDate}
              onChange={(e) => setApprovalDate(e.target.value)}
              required
            />
          </div>

          {/* 3. Remarks Field (Required) */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Remarks <span className="text-rose-500">*</span>
            </label>
            <Textarea
              label=""
              placeholder="e.g. Payment verified from company bank account."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              required
            />
            {!isRemarksEntered && (
              <p className="mt-1 text-[11px] text-rose-500">⚠ Remarks are required</p>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 dark:border-white/10 dark:bg-slate-900/80">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="approve-advance-form"
            disabled={submitting || !isFormValid}
            className="gap-2 font-bold"
          >
            <CheckCircle2 size={16} />
            {submitting ? "Approving..." : "Approve Advance Payment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
