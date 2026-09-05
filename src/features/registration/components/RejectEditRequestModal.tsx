"use client";

import React, { useState } from "react";
import { AlertCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { formatTitleCase } from "@/utils/format";
import type { RegistrationEditRequestItem } from "@/features/registration/types/registration-edit-request.types";

type RejectEditRequestModalProps = {
  isOpen: boolean;
  onClose: () => void;
  request: RegistrationEditRequestItem | null;
  onReject: (id: string, reason: string) => Promise<void>;
};

export function RejectEditRequestModal({
  isOpen,
  onClose,
  request,
  onReject,
}: RejectEditRequestModalProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !request) return null;

  async function handleConfirm() {
    if (!request) return;
    if (!reason.trim()) {
      setError("Rejection reason is required.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await onReject(request.id, reason.trim());
      setReason("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to reject edit request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div
        className="w-full max-w-lg overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl transition-all dark:border-white/10 dark:bg-slate-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-modal-title"
      >
        {/* Header */}
        <div className="border-b border-rose-100 bg-rose-50/70 px-6 py-5 dark:border-white/10 dark:bg-rose-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white shadow-md shadow-rose-500/20">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 id="reject-modal-title" className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Reject Edit Request
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tracking #{" "}
                  <strong className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    {request.trackingNumber}
                  </strong>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition cursor-pointer dark:hover:bg-white/10 dark:hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs font-semibold text-rose-700 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300">
            <p>
              Customer: <strong className="font-bold text-slate-900 dark:text-white">{request.customerName ? formatTitleCase(request.customerName) : "-"}</strong>
            </p>
            <p className="mt-1">
              Original document details will remain unchanged in the database.
            </p>
          </div>

          <div>
            <Textarea
              label="Rejection Reason *"
              rows={4}
              placeholder="Explain why this edit request is rejected..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError("");
              }}
              disabled={submitting}
              className="w-full text-xs"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-white/10 dark:bg-slate-800/40">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleConfirm}
            disabled={submitting || !reason.trim()}
            className="gap-2 font-bold"
          >
            <XCircle className="h-4 w-4" />
            {submitting ? "Rejecting..." : "Confirm Reject"}
          </Button>
        </div>
      </div>
    </div>
  );
}
