"use client";

import React, { useState } from "react";
import { AlertCircle, CheckCircle2, FileText, ArrowRight, User, Calendar, MapPin, Building } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDate, formatDateTime, formatTitleCase } from "@/utils/format";
import type { RegistrationEditRequestItem } from "@/features/registration/types/registration-edit-request.types";

type EditRequestDiffModalProps = {
  isOpen: boolean;
  onClose: () => void;
  request: RegistrationEditRequestItem | null;
  onApprove: (id: string) => Promise<void>;
};

export function EditRequestDiffModal({
  isOpen,
  onClose,
  request,
  onApprove,
}: EditRequestDiffModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !request) return null;

  async function handleConfirm() {
    if (!request) return;
    setSubmitting(true);
    setError("");
    try {
      await onApprove(request.id);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to approve edit request.");
    } finally {
      setSubmitting(false);
    }
  }

  const fieldChanges = request.fieldChanges || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div
        className="w-full max-w-3xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl transition-all dark:border-white/10 dark:bg-slate-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50/40 px-6 py-5 dark:border-white/10 dark:from-slate-800 dark:to-slate-800/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 id="modal-title" className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Approve Edit Request
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tracking #{" "}
                  <strong className="font-mono font-bold text-blue-600 dark:text-blue-400">
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

        {/* Body Content */}
        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs font-semibold text-rose-700 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Document Summary Card */}
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:grid-cols-4 dark:border-white/10 dark:bg-white/5">
            <div>
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">Customer Name</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {request.customerName ? formatTitleCase(request.customerName) : "-"}
              </span>
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">Document Type</span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {request.documentType || request.documentName || "-"}
              </span>
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">Registration Office</span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {request.registrationOffice || "-"}
              </span>
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">Current Office</span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {request.currentOffice || request.registrationOffice || "-"}
              </span>
            </div>
          </div>

          {/* Request Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-blue-50/60 px-4 py-3 text-xs text-slate-700 dark:bg-blue-900/20 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>
                Requested By: <strong className="font-bold text-slate-900 dark:text-white">{request.requestedBy || "System User"}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>
                Date: <strong className="font-bold text-slate-900 dark:text-white">{formatDateTime(request.requestedAt)}</strong>
              </span>
            </div>
          </div>

          {/* Changed Fields Diff Table */}
          <div>
            <h4 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Proposed Field Changes ({fieldChanges.length})
            </h4>
            {fieldChanges.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-white/10">
                No individual field changes detected.
              </p>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 font-bold uppercase text-slate-600 dark:bg-white/5 dark:text-slate-300">
                    <tr>
                      <th className="px-4 py-3">Field</th>
                      <th className="px-4 py-3">Old Value</th>
                      <th className="px-4 py-3 text-center w-8"></th>
                      <th className="px-4 py-3">New Proposed Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white dark:divide-white/5 dark:bg-transparent">
                    {fieldChanges.map((change, index) => (
                      <tr key={index} className="transition hover:bg-blue-50/40 dark:hover:bg-white/5">
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {change.fieldLabel}
                          {change.category && (
                            <span className="block text-[10px] font-normal text-slate-400">
                              {change.category}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block rounded-lg bg-rose-50 px-2.5 py-1 font-mono font-medium text-rose-700 line-through dark:bg-rose-500/10 dark:text-rose-300">
                            {change.oldValue === null || change.oldValue === "" ? (
                              <em className="text-slate-400 not-italic">None / Empty</em>
                            ) : (
                              String(change.oldValue)
                            )}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-center text-slate-400">
                          <ArrowRight className="h-3.5 w-3.5 mx-auto text-blue-500" />
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block rounded-lg bg-emerald-50 px-2.5 py-1 font-mono font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                            {change.newValue === null || change.newValue === "" ? (
                              <em className="text-slate-400 not-italic">Cleared / Empty</em>
                            ) : (
                              String(change.newValue)
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            <p className="font-semibold">
              ⚠️ Confirming this approval will immediately update the document with all proposed values and log an immutable audit history record.
            </p>
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
            onClick={handleConfirm}
            disabled={submitting}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            <CheckCircle2 className="h-4 w-4" />
            {submitting ? "Approving..." : "Confirm Approve"}
          </Button>
        </div>
      </div>
    </div>
  );
}
