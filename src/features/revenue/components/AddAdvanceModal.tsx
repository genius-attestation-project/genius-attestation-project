"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, FileUp, AlertCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { MultiFileUpload } from "@/components/common/MultiFileUpload";

type AddAdvanceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  registrationId: string;
  trackingNumber: string;
  customerName: string;
  totalCharges: number;
  currentApprovedAdvance: number;
  currentBalance: number;
  personOptions?: { label: string; value: string }[];
  onSuccess?: () => void;
};

const PAYMENT_MODES = [
  "Cash",
  "UPI",
  "Bank Transfer",
  "Cheque",
  "Card",
  "Online",
];

export function AddAdvanceModal({
  isOpen,
  onClose,
  registrationId,
  trackingNumber,
  customerName,
  totalCharges,
  currentApprovedAdvance,
  currentBalance,
  personOptions = [],
  onSuccess,
}: AddAdvanceModalProps) {
  const todayStr = new Date().toISOString().split("T")[0];

  const [advanceAmount, setAdvanceAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(todayStr);
  const [paymentMode, setPaymentMode] = useState<string>("Cash");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [collectedBy, setCollectedBy] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [proofFileIds, setProofFileIds] = useState<string[]>([]);
  const [proofFileType, setProofFileType] = useState<string>("Receipt");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAdvanceAmount("");
      setPaymentDate(todayStr);
      setPaymentMode("Cash");
      setReferenceNumber("");
      setCollectedBy("");
      setRemarks("");
      setProofFileIds([]);
      setProofFileType("Receipt");
      setError(null);
    }
  }, [isOpen, todayStr]);

  if (!isOpen) return null;

  const numAmount = parseFloat(advanceAmount) || 0;
  const isAmountValid = numAmount > 0 && numAmount <= currentBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numAmount <= 0) {
      setError("Advance Amount must be greater than zero.");
      return;
    }

    if (numAmount > currentBalance) {
      setError(`Advance Amount cannot exceed current remaining balance (₹${currentBalance.toLocaleString()}).`);
      return;
    }

    if (!paymentDate) {
      setError("Payment Date is mandatory.");
      return;
    }

    if (!paymentMode) {
      setError("Payment Mode is mandatory.");
      return;
    }

    if (proofFileIds.length === 0) {
      setError("Proof upload is mandatory for advance payment requests.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/advance-payment-approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId,
          advanceAmount: numAmount,
          paymentDate,
          paymentMode,
          referenceNumber: referenceNumber.trim() || null,
          collectedBy: collectedBy.trim() || null,
          remarks: remarks.trim() || null,
          proofFileType,
          receiptFileId: proofFileIds[0] || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || json.message || "Failed to save advance payment request.");
      }

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-white/10">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Registration #{trackingNumber}
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Add Advance Payment</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customer: <span className="font-semibold text-slate-700 dark:text-slate-200">{customerName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Financial Overview Banner */}
        <div className="my-4 grid grid-cols-3 gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-3 text-center text-xs dark:border-blue-900/40 dark:bg-blue-950/20">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Charges</span>
            <span className="font-extrabold text-slate-900 dark:text-white">₹{totalCharges.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase block">Approved Advance</span>
            <span className="font-extrabold text-emerald-700 dark:text-emerald-300">₹{currentApprovedAdvance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase block">Current Balance</span>
            <span className="font-extrabold text-blue-700 dark:text-blue-300">₹{currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                label="Advance Amount *"
                type="number"
                min="1"
                max={currentBalance}
                step="0.01"
                placeholder="Enter amount (₹)"
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(e.target.value)}
                required
              />
              {numAmount > currentBalance && (
                <p className="mt-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                  Exceeds remaining balance!
                </p>
              )}
            </div>
            <div>
              <Input
                label="Payment Date *"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Mode & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="grid gap-1.5">
              <span className="font-bold text-slate-700 dark:text-slate-300">Payment Mode *</span>
              <select
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-slate-800 dark:text-white"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                required
              >
                {PAYMENT_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <Input
                label="Reference Number"
                placeholder="e.g. Txn ID / Cheque No / Ref #"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Collected By & Proof Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="grid gap-1.5">
              <span className="font-bold text-slate-700 dark:text-slate-300">Collected By</span>
              {personOptions.length > 0 ? (
                <select
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-slate-800 dark:text-white"
                  value={collectedBy}
                  onChange={(e) => setCollectedBy(e.target.value)}
                >
                  <option value="">Select collected person</option>
                  {personOptions.map((opt) => (
                    <option key={opt.value} value={opt.label}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  label=""
                  placeholder="Enter name"
                  value={collectedBy}
                  onChange={(e) => setCollectedBy(e.target.value)}
                />
              )}
            </label>

            <label className="grid gap-1.5">
              <span className="font-bold text-slate-700 dark:text-slate-300">Proof Document Type</span>
              <select
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-slate-800 dark:text-white"
                value={proofFileType}
                onChange={(e) => setProofFileType(e.target.value)}
              >
                <option value="Receipt">Receipt</option>
                <option value="Bank Slip">Bank Slip</option>
                <option value="UPI Screenshot">UPI Screenshot</option>
                <option value="Cheque Image">Cheque Image</option>
                <option value="Image">Image</option>
                <option value="PDF">PDF</option>
              </select>
            </label>
          </div>

          {/* Remarks */}
          <div>
            <Textarea
              label="Remarks"
              placeholder="Enter remarks or payment notes..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
            />
          </div>

          {/* Upload Proof */}
          <div className="pt-1">
            <MultiFileUpload
              label="Upload Proof *"
              moduleName="Advance Payment Approval"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              onFilesChange={(ids) => setProofFileIds(ids)}
              required
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-white/10">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !isAmountValid || proofFileIds.length === 0}>
              <Save size={16} className="mr-1.5" />
              {submitting ? "Submitting..." : "Save Request"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
