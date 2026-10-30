"use client";

import React from "react";
import { AlertCircle, ArrowLeftRight, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ConflictingDocument {
  id: string;
  trackingNumber: string;
  customerName?: string | null;
  documentType?: string | null;
  documentName?: string | null;
  regionOfRegistration?: string | null;
  trackingStatus?: string | null;
}

interface TrackingConflictModalProps {
  isOpen: boolean;
  trackingNumber: string;
  conflictingDoc?: ConflictingDocument | null;
  onCancel: () => void;
  onConfirmSwap: () => void;
}

export function TrackingConflictModal({
  isOpen,
  trackingNumber,
  conflictingDoc,
  onCancel,
  onConfirmSwap,
}: TrackingConflictModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div
        className="w-full max-w-lg overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl transition-all dark:border-white/10 dark:bg-slate-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="conflict-modal-title"
      >
        {/* Header */}
        <div className="border-b border-amber-100 bg-amber-50/80 px-6 py-5 dark:border-white/10 dark:bg-amber-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 text-white shadow-md shadow-amber-500/20">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 id="conflict-modal-title" className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Tracking Number Already Exists
                </h3>
                <p className="text-xs text-amber-800 dark:text-amber-400">
                  Duplicate tracking number conflict detected
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition cursor-pointer dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 text-xs text-slate-700 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-slate-300">
            <p className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Tracking number <span className="font-mono font-bold text-amber-700 dark:text-amber-400">{trackingNumber}</span> is already assigned to another document.
            </p>
            <p className="leading-relaxed text-slate-600 dark:text-slate-400">
              You can enter a different unused tracking number or request a tracking number swap.
            </p>
          </div>

          {conflictingDoc && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/5 space-y-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Assigned Document Details
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Tracking Number</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {conflictingDoc.trackingNumber}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Customer</span>
                  <span className="font-semibold text-slate-900 dark:text-white truncate block">
                    {conflictingDoc.customerName || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Document</span>
                  <span className="text-slate-800 dark:text-slate-200 truncate block">
                    {conflictingDoc.documentType || conflictingDoc.documentName || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Status</span>
                  <span className="text-slate-800 dark:text-slate-200 truncate block">
                    {conflictingDoc.trackingStatus || "-"}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl bg-blue-50/70 p-3.5 text-[11px] leading-relaxed text-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
            <strong>Note on Tracking Number Swap:</strong> Requesting a swap will create an edit request in <strong>Pending Approval &gt; Edit Request</strong>. The swap will take effect only after an authorized approver approves the request. Document data and relationships will remain preserved.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-white/10 dark:bg-slate-900/60">
          <Button variant="secondary" onClick={onCancel} type="button">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onConfirmSwap}
            type="button"
            className="gap-2"
          >
            <ArrowLeftRight className="h-4 w-4" />
            Swap Tracking Numbers
          </Button>
        </div>
      </div>
    </div>
  );
}
