"use client";

import React, { useState, useEffect } from "react";
import { X, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

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
    remarks?: string;
  } | null;
};

const PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer", "Cheque", "Card", "Online"];

export function EditAdvanceModal({
  open,
  onClose,
  onSuccess,
  item,
}: EditAdvanceModalProps) {
  const [advanceAmount, setAdvanceAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState<string>("Cash");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && item) {
      setAdvanceAmount(item.advanceAmount ? item.advanceAmount.toString() : "");
      setPaymentDate(item.paymentDate ? item.paymentDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
      setPaymentMode(item.paymentMode || "Cash");
      setReferenceNumber(item.referenceNumber && item.referenceNumber !== "-" ? item.referenceNumber : "");
      setRemarks(item.remarks || "");
      setError(null);
    }
  }, [open, item]);

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

    setSubmitting(true);
    try {
      const res = await fetch(`/api/advance-payment-approvals/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advanceAmount: numAmount,
          paymentDate,
          paymentMode,
          referenceNumber: referenceNumber.trim() || null,
          remarks: remarks.trim() || null,
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
              Edit Advance Payment · #{item.trackingNumber}
            </p>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              Edit Advance Details
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
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
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form id="edit-advance-form" onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Advance Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <Input
              label=""
              type="number"
              min="1"
              step="0.01"
              value={advanceAmount}
              onChange={(e) => setAdvanceAmount(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Payment Date
              </label>
              <Input
                label=""
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Payment Mode
              </label>
              <select
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-slate-800 dark:text-white"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
              >
                {PAYMENT_MODES.map((mode) => (
                  <option key={mode} value={mode}>{mode}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Reference Number
            </label>
            <Input
              label=""
              placeholder="Txn ID / Cheque No / Ref #"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Remarks
            </label>
            <Textarea
              label=""
              placeholder="Enter remarks..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 dark:border-white/10 dark:bg-slate-900/80">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-advance-form"
            disabled={submitting || !isAmountValid}
            className="gap-2 font-bold"
          >
            <Save size={16} />
            {submitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
