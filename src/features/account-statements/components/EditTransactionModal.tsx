"use client";

import React, { useState, useEffect } from "react";
import { X, Save, Edit3 } from "lucide-react";
import type { AccountStatementItem } from "../types/account-statements.types";

interface EditTransactionModalProps {
  isOpen: boolean;
  item: AccountStatementItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  item,
  onClose,
  onSuccess,
}) => {
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState<string>("Cash");
  const [collectedBy, setCollectedBy] = useState<string>("");
  const [narration, setNarration] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setAmount(item.amount);
      setDate(item.date);
      setPaymentMode(item.paymentMode || "Cash");
      setCollectedBy(item.collectedBy || "");
      setNarration(item.narration || "");
      setInvoiceNumber(item.invoiceNumber || "");
      setError(null);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/account-statements/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: item.sourceType,
          advanceAmount: amount,
          amount,
          paymentDate: date,
          transactionDate: date,
          paymentMode,
          collectedBy,
          narration,
          invoiceNumber,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to update transaction.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to update transaction.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Edit Transaction
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {item.sourceType === "ADVANCE_PAYMENT" ? "Revenue Advance Payment" : "Account Panel Item"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl bg-red-50 p-3 text-xs font-semibold text-red-600 dark:bg-red-950/60 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Amount */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Amount (₹) *
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              required
              className="mt-1 w-full rounded-2xl border border-slate-200/80 bg-slate-50/60 px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>

          {/* Date */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Transaction Date *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="mt-1 w-full rounded-2xl border border-slate-200/80 bg-slate-50/60 px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>

          {item.sourceType === "ADVANCE_PAYMENT" && (
            <>
              {/* Payment Mode */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Payment Mode *
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200/80 bg-slate-50/60 px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Card">Card</option>
                </select>
              </div>

              {/* Collected By */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Collected By / Registrar
                </label>
                <input
                  type="text"
                  value={collectedBy}
                  onChange={(e) => setCollectedBy(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200/80 bg-slate-50/60 px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </div>
            </>
          )}

          {/* Invoice / Reference Number */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Invoice / Tracking Number
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200/80 bg-slate-50/60 px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>

          {/* Remarks / Narration */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Remarks / Narration
            </label>
            <textarea
              rows={3}
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200/80 bg-slate-50/60 px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>

          {/* Form Action Footer */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:border-white/10 dark:bg-white/10 dark:text-white cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 cursor-pointer disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
