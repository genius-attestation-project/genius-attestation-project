"use client";

import React, { useState, useEffect } from "react";
import { X, Save, AlertCircle, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { MultiFileUpload, ExistingFileItem } from "@/components/common/MultiFileUpload";

type EditAdvanceModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: {
    id: string;
    trackingNumber: string;
    customerName: string;
    advanceAmount: number;
    totalAmount: number;
    paymentDate?: string;
    paymentMode?: string;
    referenceNumber?: string;
    collectedBy?: string;
    remarks?: string;
    bankProofFileId?: string | null;
    bankProofFileUrl?: string | null;
    bankProofFileName?: string | null;
  } | null;
};

const DEFAULT_PAYMENT_MODES = [
  "Cash",
  "UPI",
  "Bank Transfer",
  "Cheque",
  "Card",
  "Online",
  "Demand Draft",
  "Wallet",
  "Other",
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
      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-white/10 dark:bg-slate-800 dark:text-white dark:focus:ring-blue-900/30"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
    >
      {children}
    </select>
  );
}

export function EditAdvanceModal({
  open,
  onClose,
  onSuccess,
  item,
}: EditAdvanceModalProps) {
  const todayStr = new Date().toISOString().split("T")[0];

  const [paymentModeOptions, setPaymentModeOptions] = useState<string[]>(DEFAULT_PAYMENT_MODES);

  // ── Form State ──────────────────────────────────────────────────────────
  const [advanceAmount, setAdvanceAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState<string>("Cash");
  const [collectedBy, setCollectedBy] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");

  // ── Dynamic Payment Fields State ──
  const [upiTransactionId, setUpiTransactionId] = useState<string>("");
  const [bankName, setBankName] = useState<string>("");
  const [transactionRefNo, setTransactionRefNo] = useState<string>("");
  const [transferDate, setTransferDate] = useState<string>(todayStr);
  const [chequeNumber, setChequeNumber] = useState<string>("");
  const [chequeDate, setChequeDate] = useState<string>(todayStr);
  const [ddNumber, setDdNumber] = useState<string>("");
  const [ddDate, setDdDate] = useState<string>(todayStr);
  const [cardLast4, setCardLast4] = useState<string>("");
  const [approvalCode, setApprovalCode] = useState<string>("");
  const [paymentGateway, setPaymentGateway] = useState<string>("");
  const [onlineTransactionId, setOnlineTransactionId] = useState<string>("");
  const [walletName, setWalletName] = useState<string>("");
  const [walletTransactionId, setWalletTransactionId] = useState<string>("");
  const [paymentReferenceNo, setPaymentReferenceNo] = useState<string>("");
  const [paymentDescription, setPaymentDescription] = useState<string>("");

  // ── Bank Proof File State ──
  const [bankProofFileIds, setBankProofFileIds] = useState<string[]>([]);
  const [existingBankProofFiles, setExistingBankProofFiles] = useState<ExistingFileItem[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset conditional fields when mode changes manually
  const handlePaymentModeChange = (newMode: string) => {
    setPaymentMode(newMode);
    setUpiTransactionId("");
    setBankName("");
    setTransactionRefNo("");
    setTransferDate(todayStr);
    setChequeNumber("");
    setChequeDate(todayStr);
    setDdNumber("");
    setDdDate(todayStr);
    setCardLast4("");
    setApprovalCode("");
    setPaymentGateway("");
    setOnlineTransactionId("");
    setWalletName("");
    setWalletTransactionId("");
    setPaymentReferenceNo("");
    setPaymentDescription("");
  };

  useEffect(() => {
    if (open && item) {
      const mode = item.paymentMode || "Cash";
      const ref = item.referenceNumber && item.referenceNumber !== "-" ? item.referenceNumber : "";

      setAdvanceAmount(item.advanceAmount ? item.advanceAmount.toString() : "");
      setPaymentDate(item.paymentDate ? item.paymentDate.slice(0, 10) : todayStr);
      setPaymentMode(mode);
      setCollectedBy(item.collectedBy || "");
      setRemarks(item.remarks || "");
      setError(null);
      setBankProofFileIds([]);

      // Setup existing Bank Proof
      if (item.bankProofFileId) {
        setExistingBankProofFiles([
          {
            id: item.bankProofFileId,
            fileName: item.bankProofFileName || "Company Bank Proof",
            url: item.bankProofFileUrl || `/api/files/${item.bankProofFileId}/view`,
          },
        ]);
      } else {
        setExistingBankProofFiles([]);
      }

      // Pre-fill conditional fields from saved reference number
      const modeKey = mode.trim().toLowerCase();
      if (modeKey === "upi") {
        setUpiTransactionId(ref);
      } else if (modeKey.includes("bank") || modeKey === "bank transfer") {
        setTransactionRefNo(ref);
      } else if (modeKey === "cheque" || modeKey === "check") {
        setChequeNumber(ref);
      } else if (modeKey.includes("demand draft") || modeKey === "dd") {
        setDdNumber(ref);
      } else if (modeKey.includes("card")) {
        setApprovalCode(ref);
      } else if (modeKey.includes("online")) {
        setOnlineTransactionId(ref);
      } else if (modeKey === "wallet") {
        setWalletTransactionId(ref);
      } else if (modeKey === "other") {
        setPaymentReferenceNo(ref);
      }

      // Fetch dynamic payment modes from master data
      fetch("/api/master-data/payment-mode?status=Active&pageSize=200")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.items && Array.isArray(data.items)) {
            const names = data.items.map((i: any) => i.paymentModeName || i.name).filter(Boolean);
            if (names.length > 0) {
              const merged = Array.from(new Set([...names, ...DEFAULT_PAYMENT_MODES]));
              setPaymentModeOptions(merged);
            }
          }
        })
        .catch(() => {
          setPaymentModeOptions(DEFAULT_PAYMENT_MODES);
        });
    }
  }, [open, item, todayStr]);

  if (!open || !item) return null;

  const numAmount = parseFloat(advanceAmount) || 0;
  const isAmountValid = numAmount > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numAmount <= 0) {
      setError("Advance Amount must be greater than zero.");
      return;
    }

    if (!paymentDate) {
      setError("Payment Date is mandatory.");
      return;
    }

    // Dynamic Payment Mode Validations & Reference Construction
    const modeKey = (paymentMode || "").trim().toLowerCase();
    let formattedRef = "";

    if (modeKey === "upi") {
      if (!upiTransactionId.trim()) {
        setError("UPI Transaction ID is required.");
        return;
      }
      formattedRef = upiTransactionId.trim();
    } else if (modeKey.includes("bank") || modeKey === "bank transfer") {
      if (!transactionRefNo.trim()) {
        setError("Reference Number is required for Bank Transfer.");
        return;
      }
      formattedRef = bankName.trim()
        ? `Ref: ${transactionRefNo.trim()} (${bankName.trim()})`
        : transactionRefNo.trim();
    } else if (modeKey === "cheque" || modeKey === "check") {
      if (!chequeNumber.trim()) {
        setError("Cheque Number is required.");
        return;
      }
      formattedRef = bankName.trim()
        ? `Cheque #${chequeNumber.trim()} (${bankName.trim()})`
        : chequeNumber.trim();
    } else if (modeKey.includes("demand draft") || modeKey === "dd") {
      if (!ddNumber.trim()) {
        setError("DD Number is required.");
        return;
      }
      formattedRef = bankName.trim() ? `DD #${ddNumber.trim()} (${bankName.trim()})` : ddNumber.trim();
    } else if (modeKey.includes("card") || modeKey.includes("credit") || modeKey.includes("debit")) {
      if (!cardLast4.trim() && !approvalCode.trim()) {
        setError("Card details or Approval Code required.");
        return;
      }
      formattedRef = `Card ****${cardLast4.trim()} (Auth: ${approvalCode.trim()})`;
    } else if (modeKey.includes("online")) {
      if (!onlineTransactionId.trim()) {
        setError("Transaction ID is required for Online payment.");
        return;
      }
      formattedRef = paymentGateway.trim()
        ? `${paymentGateway.trim()} - ${onlineTransactionId.trim()}`
        : onlineTransactionId.trim();
    } else if (modeKey === "wallet") {
      if (!walletTransactionId.trim()) {
        setError("Wallet Transaction ID is required.");
        return;
      }
      formattedRef = walletName.trim()
        ? `${walletName.trim()} - ${walletTransactionId.trim()}`
        : walletTransactionId.trim();
    } else if (modeKey === "other") {
      if (!paymentReferenceNo.trim()) {
        setError("Reference Number is required for Other payment mode.");
        return;
      }
      formattedRef = paymentReferenceNo.trim();
    }

    setSubmitting(true);

    // Determine target Bank Proof File ID to save
    let targetBankProofFileId: string | null | undefined = undefined;
    if (bankProofFileIds.length > 0) {
      targetBankProofFileId = bankProofFileIds[0];
    } else if (existingBankProofFiles.length === 0) {
      targetBankProofFileId = null;
    }

    try {
      const res = await fetch(`/api/advance-payment-approvals/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advanceAmount: numAmount,
          paymentDate,
          paymentMode,
          referenceNumber: formattedRef || null,
          collectedBy: collectedBy.trim() || null,
          remarks: remarks.trim() || null,
          bankProofFileId: targetBankProofFileId,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || json.message || "Failed to update advance payment.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const modeKey = (paymentMode || "").trim().toLowerCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="relative flex flex-col w-full max-w-[620px] max-h-[88vh] rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900 overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-start justify-between gap-3 px-6 py-4 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-0.5">
              Edit Advance Payment · #{item.trackingNumber}
            </p>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
              Edit Advance Details
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              Customer: <span className="font-semibold text-slate-700 dark:text-slate-200">{item.customerName}</span> · Total Charges:{" "}
              <span className="font-extrabold text-slate-900 dark:text-white">
                ₹{item.totalAmount.toLocaleString()}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="shrink-0 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form id="edit-advance-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
              {/* Row 1: Advance Amount | Payment Date */}
              <div>
                <FieldLabel required>Advance Amount (₹)</FieldLabel>
                <Input
                  label=""
                  type="number"
                  min="1"
                  step="0.01"
                  className="h-9 text-xs"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  required
                />
              </div>
              <div>
                <FieldLabel required>Payment Date</FieldLabel>
                <Input
                  label=""
                  type="date"
                  className="h-9 text-xs"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />
              </div>

              {/* Row 2: Payment Mode | Collected By */}
              <div>
                <FieldLabel required>Payment Mode</FieldLabel>
                <FieldSelect value={paymentMode} onChange={handlePaymentModeChange} required>
                  {paymentModeOptions.map((mode) => (
                    <option key={mode} value={mode}>{mode}</option>
                  ))}
                </FieldSelect>
              </div>
              <div>
                <FieldLabel>Collected By</FieldLabel>
                <Input
                  label=""
                  placeholder="Enter collector name"
                  className="h-9 text-xs"
                  value={collectedBy}
                  onChange={(e) => setCollectedBy(e.target.value)}
                />
              </div>

              {/* ── Dynamic Conditional Fields ── */}
              {modeKey === "upi" && (
                <div className="sm:col-span-2">
                  <FieldLabel required>UPI Transaction ID</FieldLabel>
                  <Input
                    label=""
                    placeholder="Enter UPI Transaction ID"
                    className="h-9 text-xs"
                    value={upiTransactionId}
                    onChange={(e) => setUpiTransactionId(e.target.value)}
                    required
                  />
                </div>
              )}

              {(modeKey.includes("bank") || modeKey === "bank transfer") && (
                <>
                  <div>
                    <FieldLabel>Bank Name</FieldLabel>
                    <Input
                      label=""
                      placeholder="Enter Bank Name"
                      className="h-9 text-xs"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                    />
                  </div>
                  <div>
                    <FieldLabel required>Reference Number</FieldLabel>
                    <Input
                      label=""
                      placeholder="Enter Reference Number"
                      className="h-9 text-xs"
                      value={transactionRefNo}
                      onChange={(e) => setTransactionRefNo(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              {(modeKey === "cheque" || modeKey === "check") && (
                <>
                  <div>
                    <FieldLabel required>Cheque Number</FieldLabel>
                    <Input
                      label=""
                      placeholder="Enter Cheque Number"
                      className="h-9 text-xs"
                      value={chequeNumber}
                      onChange={(e) => setChequeNumber(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <FieldLabel>Bank Name</FieldLabel>
                    <Input
                      label=""
                      placeholder="Enter Bank Name"
                      className="h-9 text-xs"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                    />
                  </div>
                </>
              )}

              {(modeKey.includes("demand draft") || modeKey === "dd") && (
                <>
                  <div>
                    <FieldLabel required>DD Number</FieldLabel>
                    <Input
                      label=""
                      placeholder="Enter DD Number"
                      className="h-9 text-xs"
                      value={ddNumber}
                      onChange={(e) => setDdNumber(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <FieldLabel>Bank Name</FieldLabel>
                    <Input
                      label=""
                      placeholder="Enter Bank Name"
                      className="h-9 text-xs"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                    />
                  </div>
                </>
              )}

              {(modeKey.includes("card") || modeKey.includes("credit") || modeKey.includes("debit")) && (
                <>
                  <div>
                    <FieldLabel>Card Last 4 Digits</FieldLabel>
                    <Input
                      label=""
                      placeholder="e.g. 4321"
                      maxLength={4}
                      className="h-9 text-xs"
                      value={cardLast4}
                      onChange={(e) => setCardLast4(e.target.value)}
                    />
                  </div>
                  <div>
                    <FieldLabel>Approval Code</FieldLabel>
                    <Input
                      label=""
                      placeholder="Enter Approval Code"
                      className="h-9 text-xs"
                      value={approvalCode}
                      onChange={(e) => setApprovalCode(e.target.value)}
                    />
                  </div>
                </>
              )}

              {modeKey.includes("online") && (
                <>
                  <div>
                    <FieldLabel>Payment Gateway</FieldLabel>
                    <Input
                      label=""
                      placeholder="e.g. Razorpay / Stripe"
                      className="h-9 text-xs"
                      value={paymentGateway}
                      onChange={(e) => setPaymentGateway(e.target.value)}
                    />
                  </div>
                  <div>
                    <FieldLabel required>Transaction ID</FieldLabel>
                    <Input
                      label=""
                      placeholder="Enter Transaction ID"
                      className="h-9 text-xs"
                      value={onlineTransactionId}
                      onChange={(e) => setOnlineTransactionId(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              {modeKey === "wallet" && (
                <>
                  <div>
                    <FieldLabel>Wallet Name</FieldLabel>
                    <Input
                      label=""
                      placeholder="e.g. Paytm / PhonePe"
                      className="h-9 text-xs"
                      value={walletName}
                      onChange={(e) => setWalletName(e.target.value)}
                    />
                  </div>
                  <div>
                    <FieldLabel required>Wallet Transaction ID</FieldLabel>
                    <Input
                      label=""
                      placeholder="Enter Wallet Transaction ID"
                      className="h-9 text-xs"
                      value={walletTransactionId}
                      onChange={(e) => setWalletTransactionId(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              {modeKey === "other" && (
                <>
                  <div>
                    <FieldLabel required>Reference Number</FieldLabel>
                    <Input
                      label=""
                      placeholder="Enter Reference Number"
                      className="h-9 text-xs"
                      value={paymentReferenceNo}
                      onChange={(e) => setPaymentReferenceNo(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <FieldLabel>Description</FieldLabel>
                    <Input
                      label=""
                      placeholder="Enter Description"
                      className="h-9 text-xs"
                      value={paymentDescription}
                      onChange={(e) => setPaymentDescription(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* Row 3: Remarks (Full Width or 2-col) */}
              <div className="sm:col-span-2">
                <FieldLabel>Remarks</FieldLabel>
                <Textarea
                  label=""
                  placeholder="Enter remarks or payment notes..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                  className="min-h-[75px] max-h-[85px] text-xs resize-none"
                />
              </div>

              {/* Bank Proof Section (Company-Side Verification Proof) */}
              <div className="sm:col-span-2 pt-1">
                <FieldLabel>Bank Proof (Company Verification Proof)</FieldLabel>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                  Upload or replace company-side bank/payment proof for this advance.
                </p>
                <div className="[&_label.flex]:py-2.5 [&_label.flex]:px-3 [&_label.flex]:min-h-0 [&_svg.text-blue-500]:size-5 [&_svg.text-blue-500]:mb-1 [&_.space-y-3]:space-y-2">
                  <MultiFileUpload
                    label=""
                    moduleName="Advance Payment Bank Proof"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    existingFiles={existingBankProofFiles}
                    onFilesChange={(ids) => setBankProofFileIds(ids)}
                    onRemoveExistingFile={(fileId) => {
                      setExistingBankProofFiles((prev) => prev.filter((f) => f.id !== fileId));
                      setBankProofFileIds([]);
                    }}
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-end gap-2.5 px-6 py-3 border-t border-slate-100 bg-slate-50/80 dark:border-white/10 dark:bg-slate-900/80 backdrop-blur-sm">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
            className="h-9 px-4 text-xs font-semibold"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-advance-form"
            disabled={submitting || !isAmountValid}
            className="h-9 px-5 text-xs font-bold gap-1.5"
          >
            <Save size={15} />
            {submitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
