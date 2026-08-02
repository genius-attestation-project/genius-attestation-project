"use client";

import React, { useState, useEffect } from "react";
import { X, AlertCircle, Save, IndianRupee } from "lucide-react";
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

// ─── Reusable Field Label ──────────────────────────────────────────────────
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
      {children}
      {required && <span className="ml-0.5 text-rose-500">*</span>}
    </span>
  );
}

// ─── Reusable Select ──────────────────────────────────────────────────────
function FieldSelect({
  value,
  onChange,
  children,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <select
      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-900/30"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
    >
      {children}
    </select>
  );
}

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

  // ── State (unchanged) ────────────────────────────────────────────────────
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

  // ── Financial summary state (initialized from props, updated via live API call) ──
  const [financials, setFinancials] = useState({
    totalCharges: totalCharges || 0,
    currentApprovedAdvance: currentApprovedAdvance || 0,
    currentBalance: currentBalance || 0,
  });

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

      console.log("Modal received props:", {
        totalCharges,
        approvedAdvance: currentApprovedAdvance,
        balanceAmount: currentBalance,
      });

      const initTotal = Number(totalCharges || 0);
      const initAdvance = Number(currentApprovedAdvance || 0);
      const initBalance = currentBalance > 0 ? Number(currentBalance) : Math.max(0, initTotal - initAdvance);

      setFinancials({
        totalCharges: initTotal,
        currentApprovedAdvance: initAdvance,
        currentBalance: initBalance,
      });

      if (registrationId) {
        fetch(`/api/registrations/${encodeURIComponent(registrationId)}`)
          .then((res) => res.json())
          .then((data) => {
            console.log("API response:", data);
            const reg = data?.registration || data;
            if (reg) {
              const liveTotal = Number(reg.totalCharges ?? 0);
              const liveAdvance = Number(reg.advancePaid ?? 0);
              const liveBalance = Number(reg.balanceAmount ?? (liveTotal - liveAdvance));
              console.log("API response financial summary:", {
                totalCharges: liveTotal,
                approvedAdvance: liveAdvance,
                balanceAmount: liveBalance,
              });
              setFinancials({
                totalCharges: liveTotal,
                currentApprovedAdvance: liveAdvance,
                currentBalance: liveBalance,
              });
            }
          })
          .catch((err) => {
            console.error("Failed to load registration financials:", err);
          });
      }
    }
  }, [isOpen, registrationId, totalCharges, currentApprovedAdvance, currentBalance, todayStr]);

  if (!isOpen) return null;

  // ── Derived financial values with full multi-level fallbacks ──
  const effectiveTotalCharges =
    financials.totalCharges > 0
      ? financials.totalCharges
      : Number(totalCharges || 0);

  const effectiveApprovedAdvance =
    financials.currentApprovedAdvance > 0
      ? financials.currentApprovedAdvance
      : Number(currentApprovedAdvance || 0);

  const effectiveBalance =
    financials.currentBalance > 0
      ? financials.currentBalance
      : currentBalance > 0
      ? Number(currentBalance)
      : Math.max(0, effectiveTotalCharges - effectiveApprovedAdvance);

  const numAmount = parseFloat(advanceAmount) || 0;
  const isAmountValid = numAmount > 0 && numAmount <= effectiveBalance;

  // ── Submit (unchanged business logic) ────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numAmount <= 0) {
      setError("Advance Amount must be greater than zero.");
      return;
    }

    if (numAmount > effectiveBalance) {
      setError(`Advance Amount cannot exceed current remaining balance (₹${effectiveBalance.toLocaleString()}).`);
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

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    /* ── Backdrop ── */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/*
        ── Modal shell ──
        • max-h-[90vh] keeps it within viewport
        • flex flex-col lets header/footer stay fixed while body scrolls
      */}
      <div className="relative flex flex-col w-full max-w-190 max-h-[90vh] rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900 overflow-hidden">

        {/* ────────────────────────────────────────────────────────────────
            FIXED HEADER
        ──────────────────────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-100 dark:border-white/10 bg-white dark:bg-slate-900">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-0.5">
              Advance Payment Request · #{trackingNumber}
            </p>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
              Add Advance Payment
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              Customer:{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {customerName}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* ────────────────────────────────────────────────────────────────
            SCROLLABLE BODY
        ──────────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4 space-y-4">

          {/* ── Financial Summary Cards ── */}
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-blue-100 bg-linear-to-br from-blue-50/80 to-slate-50/60 p-3 dark:border-blue-900/30 dark:from-blue-950/30 dark:to-slate-900/30">
            {[
              {
                label: "Total Charges",
                value: `₹${effectiveTotalCharges.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                color: "text-slate-700 dark:text-slate-200",
                labelColor: "text-slate-400",
              },
              {
                label: "Approved Advance",
                value: `₹${effectiveApprovedAdvance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                color: "text-emerald-700 dark:text-emerald-300",
                labelColor: "text-emerald-600 dark:text-emerald-400",
              },
              {
                label: "Current Balance",
                value: `₹${effectiveBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                color: "text-blue-700 dark:text-blue-300",
                labelColor: "text-blue-600 dark:text-blue-400",
              },
            ].map((card) => (
              <div key={card.label} className="text-center">
                <p className={`text-[10px] font-bold uppercase tracking-wider ${card.labelColor}`}>
                  {card.label}
                </p>
                <p className={`mt-0.5 text-sm font-extrabold ${card.color}`}>
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          {/* ── Error Banner ── */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Form Fields ── */}
          <form id="advance-form" onSubmit={handleSubmit} className="space-y-3">

            {/* Row 1: Amount + Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel required>Advance Amount</FieldLabel>
                <Input
                  label=""
                  type="number"
                  min="1"
                  max={effectiveBalance}
                  step="0.01"
                  placeholder="Enter amount (₹)"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  required
                />
                {numAmount > effectiveBalance && numAmount > 0 && (
                  <p className="mt-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                    ⚠ Exceeds remaining balance
                  </p>
                )}
              </div>
              <div>
                <FieldLabel required>Payment Date</FieldLabel>
                <Input
                  label=""
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Row 2: Mode + Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel required>Payment Mode</FieldLabel>
                <FieldSelect value={paymentMode} onChange={setPaymentMode} required>
                  {PAYMENT_MODES.map((mode) => (
                    <option key={mode} value={mode}>{mode}</option>
                  ))}
                </FieldSelect>
              </div>
              <div>
                <FieldLabel>Reference Number</FieldLabel>
                <Input
                  label=""
                  placeholder="Txn ID / Cheque No / Ref #"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                />
              </div>
            </div>

            {/* Row 3: Collected By + Proof Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel>Collected By</FieldLabel>
                {personOptions.length > 0 ? (
                  <FieldSelect value={collectedBy} onChange={setCollectedBy}>
                    <option value="">Select person</option>
                    {personOptions.map((opt) => (
                      <option key={opt.value} value={opt.label}>{opt.label}</option>
                    ))}
                  </FieldSelect>
                ) : (
                  <Input
                    label=""
                    placeholder="Enter name"
                    value={collectedBy}
                    onChange={(e) => setCollectedBy(e.target.value)}
                  />
                )}
              </div>
              <div>
                <FieldLabel>Proof Document Type</FieldLabel>
                <FieldSelect value={proofFileType} onChange={setProofFileType}>
                  <option value="Receipt">Receipt</option>
                  <option value="Bank Slip">Bank Slip</option>
                  <option value="UPI Screenshot">UPI Screenshot</option>
                  <option value="Cheque Image">Cheque Image</option>
                  <option value="Image">Image</option>
                  <option value="PDF">PDF</option>
                </FieldSelect>
              </div>
            </div>

            {/* Row 4: Remarks */}
            <div>
              <FieldLabel>Remarks</FieldLabel>
              <Textarea
                label=""
                placeholder="Enter remarks or payment notes..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
              />
            </div>

            {/* Row 5: Upload Proof — compact wrapper overrides internal padding */}
            <div>
              <FieldLabel required>Upload Proof</FieldLabel>
              <div className="[&_label.flex]:p-3 [&_label.flex]:min-h-0 [&_label.flex]:py-4">
                <MultiFileUpload
                  label=""
                  moduleName="Advance Payment Approval"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onFilesChange={(ids) => setProofFileIds(ids)}
                  required
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                Accepted: JPG, PNG, WEBP, PDF · Required
              </p>
            </div>

          </form>
        </div>

        {/* ────────────────────────────────────────────────────────────────
            STICKY FOOTER — always visible, never scrolls away
        ──────────────────────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 dark:border-white/10 dark:bg-slate-900/80 backdrop-blur-sm">
          {/* Left: status hint */}
          <p className="hidden sm:block text-[11px] text-slate-400 dark:text-slate-500 truncate">
            {proofFileIds.length > 0
              ? `✓ ${proofFileIds.length} proof file${proofFileIds.length > 1 ? "s" : ""} attached`
              : "Upload proof to enable submission"}
          </p>

          {/* Right: action buttons */}
          <div className="flex items-center gap-2 ml-auto">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
              className="h-9 px-4 text-sm"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="advance-form"
              disabled={submitting || !isAmountValid || proofFileIds.length === 0}
              className="h-9 px-5 text-sm font-bold gap-1.5"
            >
              <Save size={15} />
              {submitting ? "Submitting…" : "Submit Request"}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
