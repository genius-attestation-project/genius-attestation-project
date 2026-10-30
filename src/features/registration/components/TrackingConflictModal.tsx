"use client";

import React, { useState, useEffect } from "react";
import { AlertCircle, ArrowLeftRight, X, ArrowRight, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface ConflictingDocument {
  id: string;
  trackingNumber: string;
  customerName?: string | null;
  documentType?: string | null;
  documentName?: string | null;
  regionOfRegistration?: string | null;
  officeLocationName?: string | null;
  trackingStatus?: string | null;
}

export interface CurrentDocumentInfo {
  id: string;
  trackingNumber: string;
  customerName?: string | null;
  documentType?: string | null;
  documentName?: string | null;
  regionOfRegistration?: string | null;
  trackingStatus?: string | null;
}

export interface TrackingConflictModalProps {
  isOpen: boolean;
  trackingNumber: string;
  currentDoc?: CurrentDocumentInfo | null;
  conflictingDoc?: ConflictingDocument | null;
  onCancel: () => void;
  onSubmitSwap?: () => Promise<void>;
  onConfirmSwap?: () => void;
}

export function TrackingConflictModal({
  isOpen,
  trackingNumber,
  currentDoc,
  conflictingDoc,
  onCancel,
  onSubmitSwap,
  onConfirmSwap,
}: TrackingConflictModalProps) {
  const [step, setStep] = useState<"conflict" | "confirm_swap">("conflict");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setStep("conflict");
      setSubmitting(false);
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const targetTrackingNumber = conflictingDoc?.trackingNumber || trackingNumber;
  const currentTrackingNumber = currentDoc?.trackingNumber || "";

  async function handleSubmitSwap() {
    if (onSubmitSwap) {
      setSubmitting(true);
      setError("");
      try {
        await onSubmitSwap();
      } catch (err: any) {
        setError(err.message || "Failed to submit tracking number swap request.");
      } finally {
        setSubmitting(false);
      }
    } else if (onConfirmSwap) {
      onConfirmSwap();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div
        className="w-full max-w-xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl transition-all dark:border-white/10 dark:bg-slate-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="conflict-modal-title"
      >
        {/* Header */}
        <div
          className={`border-b px-6 py-5 ${
            step === "confirm_swap"
              ? "border-indigo-100 bg-gradient-to-r from-indigo-50 to-blue-50/50 dark:border-white/10 dark:from-slate-800 dark:to-indigo-950/40"
              : "border-amber-100 bg-amber-50/80 dark:border-white/10 dark:bg-amber-950/20"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md ${
                  step === "confirm_swap"
                    ? "bg-indigo-600 shadow-indigo-500/20"
                    : "bg-amber-600 shadow-amber-500/20"
                }`}
              >
                {step === "confirm_swap" ? (
                  <ArrowLeftRight className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
              </div>
              <div>
                <h3
                  id="conflict-modal-title"
                  className="text-lg font-extrabold text-slate-900 dark:text-white"
                >
                  {step === "confirm_swap"
                    ? "Confirm Tracking Number Swap Request"
                    : "Tracking Number Already Exists"}
                </h3>
                <p
                  className={`text-xs ${
                    step === "confirm_swap"
                      ? "text-indigo-800 dark:text-indigo-400"
                      : "text-amber-800 dark:text-amber-400"
                  }`}
                >
                  {step === "confirm_swap"
                    ? "Review both documents before submitting to Pending Approval"
                    : "Duplicate tracking number conflict detected"}
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              disabled={submitting}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition cursor-pointer dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs font-semibold text-rose-700 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === "conflict" ? (
            <>
              {/* Conflict Message */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-slate-700 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-slate-300">
                <p className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                  Tracking number{" "}
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                    {targetTrackingNumber}
                  </span>{" "}
                  is already assigned to another document.
                </p>
                <p className="leading-relaxed text-slate-600 dark:text-slate-400">
                  You can enter a different unused tracking number or request a tracking number swap.
                </p>
              </div>

              {/* Assigned Document Details Card */}
              {conflictingDoc && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5 space-y-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Currently Assigned Document Details
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
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Status / Office</span>
                      <span className="text-slate-800 dark:text-slate-200 truncate block">
                        {conflictingDoc.trackingStatus || conflictingDoc.regionOfRegistration || "-"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-xl bg-blue-50/70 p-3.5 text-[11px] leading-relaxed text-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                <strong>How Swap Works:</strong> Selecting &quot;Swap Tracking Numbers&quot; allows you to review the swap details. Upon confirmation, a swap request is submitted to <strong>Pending Approval &gt; Edit Request</strong>. The swap will take effect only after an authorized approver approves the request.
              </div>
            </>
          ) : (
            <>
              {/* Swap Confirmation Comparison */}
              <div className="space-y-4">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Please confirm the proposed tracking number exchange between the two documents below:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Document A Card */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-white/10">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Document A (Current)
                      </span>
                      <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        This Document
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Tracking Number</span>
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="line-through text-rose-600 font-bold dark:text-rose-400">
                            {currentTrackingNumber || "-"}
                          </span>
                          <ArrowRight className="h-3 w-3 text-slate-400" />
                          <span className="text-emerald-600 font-bold dark:text-emerald-400">
                            {targetTrackingNumber}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Customer</span>
                        <span className="font-semibold text-slate-900 dark:text-white truncate block">
                          {currentDoc?.customerName || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Document Type</span>
                        <span className="text-slate-700 dark:text-slate-300 truncate block">
                          {currentDoc?.documentType || currentDoc?.documentName || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Status</span>
                        <span className="text-slate-700 dark:text-slate-300 truncate block">
                          {currentDoc?.trackingStatus || "-"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Document B Card */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-white/10">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Document B (Target)
                      </span>
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        Conflicting Doc
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Tracking Number</span>
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="line-through text-rose-600 font-bold dark:text-rose-400">
                            {targetTrackingNumber}
                          </span>
                          <ArrowRight className="h-3 w-3 text-slate-400" />
                          <span className="text-emerald-600 font-bold dark:text-emerald-400">
                            {currentTrackingNumber || "-"}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Customer</span>
                        <span className="font-semibold text-slate-900 dark:text-white truncate block">
                          {conflictingDoc?.customerName || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Document Type</span>
                        <span className="text-slate-700 dark:text-slate-300 truncate block">
                          {conflictingDoc?.documentType || conflictingDoc?.documentName || "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Status</span>
                        <span className="text-slate-700 dark:text-slate-300 truncate block">
                          {conflictingDoc?.trackingStatus || "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3.5 text-xs text-indigo-950 dark:border-indigo-800/60 dark:bg-indigo-950/30 dark:text-indigo-200">
                  <p className="font-semibold mb-1">
                    🔒 The swap will not happen immediately.
                  </p>
                  <p className="text-[11px] leading-relaxed text-indigo-900 dark:text-indigo-300">
                    Clicking <strong>&quot;Submit Swap Request&quot;</strong> will create an edit request under{" "}
                    <strong>Pending Approval &gt; Edit Request</strong>. Both documents will retain their current tracking numbers until an authorized approver approves the request. All customer data, payments, and document IDs will remain unchanged.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-white/10 dark:bg-slate-900/60">
          {step === "confirm_swap" ? (
            <Button
              variant="secondary"
              onClick={() => setStep("conflict")}
              disabled={submitting}
              type="button"
              className="gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={onCancel} disabled={submitting} type="button">
              Cancel
            </Button>

            {step === "conflict" ? (
              <Button
                variant="primary"
                onClick={() => setStep("confirm_swap")}
                type="button"
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                <ArrowLeftRight className="h-4 w-4" />
                Swap Tracking Numbers
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleSubmitSwap}
                disabled={submitting}
                type="button"
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <ArrowLeftRight className="h-4 w-4" />
                    Submit Swap Request
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

