"use client";

import React, { useState } from "react";
import { AlertCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { AccountApprovalItem } from "../types/account-approval.types";

interface AccountApprovalRejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: AccountApprovalItem | null;
  onReject: (id: string, reason: string) => Promise<void>;
}

export function AccountApprovalRejectModal({
  isOpen,
  onClose,
  request,
  onReject,
}: AccountApprovalRejectModalProps) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setError("Please provide a reason for rejecting this transaction edit.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await onReject(request.id, rejectionReason.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to reject request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl transition-all dark:border-white/10 dark:bg-slate-900"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="border-b border-slate-100 bg-rose-50/70 px-6 py-4 dark:border-white/10 dark:bg-rose-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 text-white shadow-md shadow-rose-500/20">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Reject Transaction Edit
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {request.trackingNumber ? `Tracking #${request.trackingNumber}` : "Account Statement Item"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition cursor-pointer dark:hover:bg-white/10 dark:hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Rejecting this request will keep the original transaction data intact without any changes.
          </p>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Rejection Reason *
            </label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Provide a clear explanation for rejecting these changes..."
              required
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-800 outline-none focus:border-rose-500 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl px-4 py-2 text-xs font-semibold"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="danger"
              disabled={submitting}
              className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-5 py-2 text-xs font-bold shadow-md shadow-rose-500/20"
            >
              <XCircle className="h-4 w-4" />
              {submitting ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
