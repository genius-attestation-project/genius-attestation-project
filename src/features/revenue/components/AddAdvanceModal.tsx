"use client";

import React, { useState, useEffect } from "react";
import { X, AlertCircle, Save } from "lucide-react";
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

  // ── Payment Mode Options State ──
  const [paymentModeOptions, setPaymentModeOptions] = useState<string[]>(DEFAULT_PAYMENT_MODES);

  // ── Form State ──────────────────────────────────────────────────────────
  const [advanceAmount, setAdvanceAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(todayStr);
  const [paymentMode, setPaymentMode] = useState<string>("Cash");
  const [collectedBy, setCollectedBy] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [proofFileIds, setProofFileIds] = useState<string[]>([]);
  const [proofFileType, setProofFileType] = useState<string>("Receipt");

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

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Financial summary state ──
  const [financials, setFinancials] = useState({
    totalCharges: totalCharges || 0,
    currentApprovedAdvance: currentApprovedAdvance || 0,
    currentBalance: currentBalance || 0,
  });

  // Reset conditional fields whenever payment mode changes
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
    if (isOpen) {
      setAdvanceAmount("");
      setPaymentDate(todayStr);
      setPaymentMode("Cash");
      setCollectedBy("");
      setRemarks("");
      setProofFileIds([]);
      setProofFileType("Receipt");
      setError(null);

      // Reset dynamic fields
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
            const reg = data?.registration || data;
            if (reg) {
              const liveTotal = Number(reg.totalCharges ?? 0);
              const liveAdvance = Number(reg.advancePaid ?? 0);
              const liveBalance = Number(reg.balanceAmount ?? (liveTotal - liveAdvance));
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

  // ── Derived financial values ──
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

  // ── Submit logic matching Revenue Registration dynamic payment mode validation ──
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
      if (!bankName.trim() || !transactionRefNo.trim() || !transferDate) {
        setError("Bank Name, Transaction Reference Number, and Transfer Date are required for Bank Transfer.");
        return;
      }
      formattedRef = `Ref: ${transactionRefNo.trim()} (${bankName.trim()})`;
    } else if (modeKey === "cheque" || modeKey === "check") {
      if (!chequeNumber.trim() || !bankName.trim() || !chequeDate) {
        setError("Cheque Number, Bank Name, and Cheque Date are required for Cheque payments.");
        return;
      }
      formattedRef = `Cheque #${chequeNumber.trim()} (${bankName.trim()})`;
    } else if (modeKey.includes("demand draft") || modeKey === "dd") {
      if (!ddNumber.trim() || !bankName.trim() || !ddDate) {
        setError("DD Number, Bank Name, and DD Date are required for Demand Draft.");
        return;
      }
      formattedRef = `DD #${ddNumber.trim()} (${bankName.trim()})`;
    } else if (modeKey.includes("card") || modeKey.includes("credit") || modeKey.includes("debit")) {
      if (!cardLast4.trim() || !approvalCode.trim()) {
        setError("Card Last 4 Digits and Approval Code are required for Card payments.");
        return;
      }
      formattedRef = `Card ****${cardLast4.trim()} (Auth: ${approvalCode.trim()})`;
    } else if (modeKey.includes("online")) {
      if (!paymentGateway.trim() || !onlineTransactionId.trim()) {
        setError("Payment Gateway and Transaction ID are required for Online payments.");
        return;
      }
      formattedRef = `${paymentGateway.trim()} - ${onlineTransactionId.trim()}`;
    } else if (modeKey === "wallet") {
      if (!walletName.trim() || !walletTransactionId.trim()) {
        setError("Wallet Name and Transaction ID are required for Wallet payments.");
        return;
      }
      formattedRef = `${walletName.trim()} - ${walletTransactionId.trim()}`;
    } else if (modeKey === "other") {
      if (!paymentReferenceNo.trim() || !paymentDescription.trim()) {
        setError("Reference Number and Description are required for Other payment mode.");
        return;
      }
      formattedRef = `Ref: ${paymentReferenceNo.trim()} (${paymentDescription.trim()})`;
    }

    if (proofFileIds.length === 0) {
      setError("Proof upload is mandatory for advance payment requests.");
      return;
    }

    setSubmitting(true);
    const payload = {
      registrationId,
      revenueRegistrationId: registrationId,
      advanceAmount: numAmount,
      amount: numAmount,
      paymentDate,
      paymentMode,
      referenceNumber: formattedRef || null,
      upiTransactionId: modeKey === "upi" ? upiTransactionId.trim() : null,
      bankName: (modeKey.includes("bank") || modeKey === "cheque" || modeKey.includes("demand draft")) ? bankName.trim() : null,
      transactionRefNo: modeKey.includes("bank") ? transactionRefNo.trim() : null,
      transferDate: modeKey.includes("bank") ? transferDate : null,
      chequeNumber: modeKey === "cheque" ? chequeNumber.trim() : null,
      chequeDate: modeKey === "cheque" ? chequeDate : null,
      ddNumber: modeKey.includes("demand draft") ? ddNumber.trim() : null,
      ddDate: modeKey.includes("demand draft") ? ddDate : null,
      cardLast4: modeKey.includes("card") ? cardLast4.trim() : null,
      approvalCode: modeKey.includes("card") ? approvalCode.trim() : null,
      paymentGateway: modeKey.includes("online") ? paymentGateway.trim() : null,
      onlineTransactionId: modeKey.includes("online") ? onlineTransactionId.trim() : null,
      walletName: modeKey === "wallet" ? walletName.trim() : null,
      walletTransactionId: modeKey === "wallet" ? walletTransactionId.trim() : null,
      collectedBy: collectedBy.trim() || null,
      remarks: remarks.trim() || null,
      proofFileType,
      receiptFileId: proofFileIds[0] || null,
      proofFileId: proofFileIds[0] || null,
      proofFiles: proofFileIds,
    };

    console.log("[Frontend] Advance payment submission payload:", payload);

    try {
      const res = await fetch("/api/advance-payment-approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  const modeKey = (paymentMode || "").trim().toLowerCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex flex-col w-full max-w-155 max-h-[88vh] rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900 overflow-hidden">
        {/* Compact Header */}
        <div className="shrink-0 flex items-start justify-between gap-3 px-6 py-4 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900">
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

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4 space-y-4">
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-3 gap-2.5 rounded-2xl border border-blue-100 bg-linear-to-br from-blue-50/80 to-slate-50/60 p-3 dark:border-blue-900/30 dark:from-blue-950/30 dark:to-slate-900/30">
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

          {/* Error Banner */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Balanced 2-Column Form Grid ── */}
          <form id="advance-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
              {/* Row 1: Advance Amount | Payment Date */}
              <div>
                <FieldLabel required>Advance Amount</FieldLabel>
                <Input
                  label=""
                  type="number"
                  min="1"
                  max={effectiveBalance}
                  step="0.01"
                  placeholder="Enter amount (₹)"
                  className="h-9 text-xs"
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
                    className="h-9 text-xs"
                    value={collectedBy}
                    onChange={(e) => setCollectedBy(e.target.value)}
                  />
                )}
              </div>

              {/* ── Dynamic Conditional Payment Mode Fields Integrated into Grid ── */}
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
                    <FieldLabel required>Bank Name</FieldLabel>
                    <Input
                      label=""
                      placeholder="Enter Bank Name"
                      className="h-9 text-xs"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      required
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
                  <div>
                    <FieldLabel required>Transfer Date</FieldLabel>
                    <Input
                      label=""
                      type="date"
                      className="h-9 text-xs"
                      value={transferDate}
                      onChange={(e) => setTransferDate(e.target.value)}
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
                    <FieldLabel required>Bank Name</FieldLabel>
                    <Input
                      label=""
                      placeholder="Enter Bank Name"
                      className="h-9 text-xs"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <FieldLabel required>Cheque Date</FieldLabel>
                    <Input
                      label=""
                      type="date"
                      className="h-9 text-xs"
                      value={chequeDate}
                      onChange={(e) => setChequeDate(e.target.value)}
                      required
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
                    <FieldLabel required>Bank Name</FieldLabel>
                    <Input
                      label=""
                      placeholder="Enter Bank Name"
                      className="h-9 text-xs"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <FieldLabel required>DD Date</FieldLabel>
                    <Input
                      label=""
                      type="date"
                      className="h-9 text-xs"
                      value={ddDate}
                      onChange={(e) => setDdDate(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              {(modeKey.includes("card") || modeKey.includes("credit") || modeKey.includes("debit")) && (
                <>
                  <div>
                    <FieldLabel required>Card Last 4 Digits</FieldLabel>
                    <Input
                      label=""
                      placeholder="e.g. 4321"
                      maxLength={4}
                      className="h-9 text-xs"
                      value={cardLast4}
                      onChange={(e) => setCardLast4(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <FieldLabel required>Approval Code</FieldLabel>
                    <Input
                      label=""
                      placeholder="Enter Approval Code"
                      className="h-9 text-xs"
                      value={approvalCode}
                      onChange={(e) => setApprovalCode(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              {modeKey.includes("online") && (
                <>
                  <div>
                    <FieldLabel required>Payment Gateway</FieldLabel>
                    <Input
                      label=""
                      placeholder="e.g. Razorpay / Stripe"
                      className="h-9 text-xs"
                      value={paymentGateway}
                      onChange={(e) => setPaymentGateway(e.target.value)}
                      required
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
                    <FieldLabel required>Wallet Name</FieldLabel>
                    <Input
                      label=""
                      placeholder="e.g. Paytm / PhonePe"
                      className="h-9 text-xs"
                      value={walletName}
                      onChange={(e) => setWalletName(e.target.value)}
                      required
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
                    <FieldLabel required>Description</FieldLabel>
                    <Input
                      label=""
                      placeholder="Enter Payment Description"
                      className="h-9 text-xs"
                      value={paymentDescription}
                      onChange={(e) => setPaymentDescription(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              {/* Row 3: Proof Document Type | Remarks */}
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
              <div>
                <FieldLabel>Remarks</FieldLabel>
                <Textarea
                  label=""
                  placeholder="Enter remarks or payment notes..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                  className="min-h-18.75 max-h-21.25 text-xs resize-none"
                />
              </div>

              {/* Upload Proof Section (Full Width) */}
              <div className="sm:col-span-2 pt-1">
                <FieldLabel required>Upload Proof</FieldLabel>
                <div className="[&_label.flex]:py-2.5 [&_label.flex]:px-3 [&_label.flex]:min-h-0 [&_svg.text-blue-500]:size-5 [&_svg.text-blue-500]:mb-1 [&_.space-y-3]:space-y-2">
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
            </div>
          </form>
        </div>

        {/* Compact Fixed Footer */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-3 border-t border-slate-100 bg-slate-50/80 dark:border-white/10 dark:bg-slate-900/80 backdrop-blur-sm">
          <p className="hidden sm:block text-[11px] text-slate-400 dark:text-slate-500 truncate">
            {proofFileIds.length > 0
              ? `✓ ${proofFileIds.length} proof file${proofFileIds.length > 1 ? "s" : ""} attached`
              : "Upload proof to enable submission"}
          </p>

          <div className="flex items-center gap-2.5 ml-auto">
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
              form="advance-form"
              disabled={submitting || !isAmountValid || proofFileIds.length === 0}
              className="h-9 px-5 text-xs font-bold gap-1.5"
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
