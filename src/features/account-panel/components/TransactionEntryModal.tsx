"use client";

import React, { useState, useEffect } from "react";
import type { AccountNode } from "@/features/account-menu/types/account-menu.types";
import { FileUpload } from "@/components/common/FileUpload";
import { Button } from "@/components/ui/Button";
import {
  X,
  Receipt,
  FileText,
  Calendar,
  DollarSign,
  AlignLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  Sparkles,
} from "lucide-react";

interface TransactionEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: AccountNode | null;
  activeOfficeName?: string | null;
  onSuccess?: () => void;
}

export const TransactionEntryModal: React.FC<TransactionEntryModalProps> = ({
  isOpen,
  onClose,
  account,
  activeOfficeName,
  onSuccess,
}) => {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [billAttachmentId, setBillAttachmentId] = useState("");
  const [transactionDate, setTransactionDate] = useState("");
  const [amount, setAmount] = useState("");
  const [narration, setNarration] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Populate default date on modal open
  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split("T")[0];
      setTransactionDate(today);
      setInvoiceNumber("");
      setBillAttachmentId("");
      setAmount("");
      setNarration("");
      setError("");
      setSuccessMsg("");
    }
  }, [isOpen, account]);

  if (!isOpen || !account) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    // Validate required fields
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError("Please enter a valid positive amount greater than 0.");
      return;
    }

    if (!transactionDate) {
      setError("Please select a transaction date.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/account-panel/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId: account.id,
          invoiceNumber: invoiceNumber.trim() || undefined,
          billAttachment: billAttachmentId || undefined,
          transactionDate,
          amount: parseFloat(amount),
          narration: narration.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to save transaction.");
      }

      setSuccessMsg(`Transaction saved successfully for "${account.name}".`);
      
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 900);
    } catch (err: any) {
      console.error("Save transaction error:", err);
      setError(err.message || "An unexpected error occurred while saving.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl transition-all dark:border-white/10 dark:bg-slate-900 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative border-b border-slate-100 bg-slate-50/80 px-6 py-5 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Add Transaction - {account.name}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Leaf Account Entry
                  </span>
                  {activeOfficeName && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
                      <Building2 className="h-3 w-3" />
                      {activeOfficeName}
                    </span>
                  )}
                  {account.code && (
                    <span className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-mono text-slate-700 dark:bg-white/10 dark:text-slate-300">
                      {account.code}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Global Alert Messages */}
          {error && (
            <div className="flex items-center gap-2.5 rounded-2xl bg-rose-50 p-4 text-xs font-semibold text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Row 1: Invoice Number & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Invoice Number */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Invoice Number
              </label>
              <div className="relative">
                <FileText className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. INV-10025"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 pl-10 pr-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </div>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="date"
                  required
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 pl-10 pr-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Amount <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="number"
                step="any"
                min="0.01"
                required
                placeholder="Enter transaction amount (e.g. 500)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 pl-10 pr-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>
          </div>

          {/* Bill Attachment */}
          <div className="space-y-1.5">
            <FileUpload
              label="Bill Attachment"
              moduleName="Account Panel"
              fileCategory="BILL_ATTACHMENT"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onUploadComplete={(fileStorageId) => setBillAttachmentId(fileStorageId)}
              onRemove={() => setBillAttachmentId("")}
            />
          </div>

          {/* Narration */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Narration
            </label>
            <div className="relative">
              <textarea
                rows={3}
                placeholder="e.g. Electricity bill payment for August"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 text-xs font-medium text-slate-900 outline-none transition-all focus:border-blue-500 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white resize-none"
              />
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={loading || Boolean(successMsg)}
              className="min-w-36"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  Save Transaction
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
