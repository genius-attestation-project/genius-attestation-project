"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  ArrowRight,
  User,
  Calendar,
  Building,
  Image as ImageIcon,
  Eye,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDate, formatDateTime, formatTitleCase } from "@/utils/format";
import type { AccountApprovalItem } from "../types/account-approval.types";
import { TransactionProofViewer } from "@/features/account-statements/components/TransactionProofViewer";

interface AccountApprovalDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: AccountApprovalItem | null;
  onApprove: (id: string, remarks?: string) => Promise<void>;
  onOpenReject: (request: AccountApprovalItem) => void;
  canApprove?: boolean;
  canReject?: boolean;
}

export function AccountApprovalDiffModal({
  isOpen,
  onClose,
  request,
  onApprove,
  onOpenReject,
  canApprove = true,
  canReject = true,
}: AccountApprovalDiffModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [approvalRemarks, setApprovalRemarks] = useState("");
  const [error, setError] = useState("");
  const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null);
  const [previewProofTitle, setPreviewProofTitle] = useState<string>("Document Proof");

  if (!isOpen || !request) return null;

  const isPending = request.status === "Pending";

  const handleConfirmApprove = async () => {
    if (!request) return;
    setSubmitting(true);
    setError("");
    try {
      await onApprove(request.id, approvalRemarks.trim() || undefined);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to approve account transaction.");
    } finally {
      setSubmitting(false);
    }
  };

  const isOldImage =
    request.oldProofFileUrl &&
    (/\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(request.oldProofFileUrl) ||
      request.oldProofFileUrl.includes("/view"));

  const isNewImage =
    request.newProofFileUrl &&
    (/\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(request.newProofFileUrl) ||
      request.newProofFileUrl.includes("/view"));

  const isAmountChanged = request.oldAmount !== request.newAmount;
  const isDateChanged = request.oldDate !== request.newDate;
  const isModeChanged = request.oldPaymentMode !== request.newPaymentMode;
  const isBankChanged = request.oldBankName !== request.newBankName;
  const isCollectorChanged = request.oldCollectedBy !== request.newCollectedBy;
  const isInvoiceChanged = request.oldInvoiceNumber !== request.newInvoiceNumber;
  const isRemarksChanged = request.oldRemarks !== request.newRemarks;
  const isImageChanged =
    request.newProofFileUrl && request.newProofFileUrl !== request.oldProofFileUrl;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
        <div
          className="w-full max-w-3xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl transition-all dark:border-white/10 dark:bg-slate-900 flex flex-col max-h-[90vh]"
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="shrink-0 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50/40 px-6 py-5 dark:border-white/10 dark:from-slate-800 dark:to-slate-800/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    Transaction Update Request
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {request.sourceType === "ADVANCE_PAYMENT"
                      ? "Revenue Advance Payment"
                      : "Account Panel Item"}{" "}
                    {request.office ? `· ${request.office}` : ""}{" "}
                    {request.trackingNumber ? `· Tracking: ${request.trackingNumber}` : ""}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition cursor-pointer dark:hover:bg-white/10 dark:hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs font-semibold text-rose-700 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Transaction Metadata Card */}
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-4 dark:border-white/10 dark:bg-white/5 text-xs">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Customer / Item
                </span>
                <span className="font-bold text-slate-900 dark:text-white truncate block">
                  {request.customerName || "-"}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Office
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                  {request.office || "-"}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Requested By
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                  {request.requestedByName || "Staff"}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Requested Date
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                  {formatDateTime(request.requestedAt)}
                </span>
              </div>
            </div>

            {/* Before Change vs After Change Comparison Table */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Comparison: Before vs After Changes
                </h4>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 font-bold uppercase text-slate-600 dark:bg-white/5 dark:text-slate-300">
                    <tr>
                      <th className="px-4 py-3 w-36">Field</th>
                      <th className="px-4 py-3">Before Change (Old Value)</th>
                      <th className="px-2 py-3 text-center w-8"></th>
                      <th className="px-4 py-3">After Change (New Value)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white dark:divide-white/5 dark:bg-transparent">
                    {/* Amount */}
                    <tr className="hover:bg-blue-50/30 dark:hover:bg-white/5">
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        Amount
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-lg px-2.5 py-1 font-mono font-bold ${
                            isAmountChanged
                              ? "bg-rose-50 text-rose-700 line-through dark:bg-rose-500/10 dark:text-rose-300"
                              : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300"
                          }`}
                        >
                          ₹{request.oldAmount.toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center text-slate-400">
                        <ArrowRight className="h-3.5 w-3.5 mx-auto text-blue-500" />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-lg px-2.5 py-1 font-mono font-black ${
                            isAmountChanged
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300"
                          }`}
                        >
                          ₹{request.newAmount.toLocaleString("en-IN")}
                        </span>
                      </td>
                    </tr>

                    {/* Transaction Date */}
                    <tr className="hover:bg-blue-50/30 dark:hover:bg-white/5">
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        Transaction Date
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-lg px-2.5 py-1 font-medium ${
                            isDateChanged
                              ? "bg-rose-50 text-rose-700 line-through dark:bg-rose-500/10 dark:text-rose-300"
                              : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {request.oldDate ? formatDate(new Date(request.oldDate)) : "-"}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center text-slate-400">
                        <ArrowRight className="h-3.5 w-3.5 mx-auto text-blue-500" />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-lg px-2.5 py-1 font-bold ${
                            isDateChanged
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                              : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {request.newDate ? formatDate(new Date(request.newDate)) : "-"}
                        </span>
                      </td>
                    </tr>

                    {/* Payment Mode */}
                    <tr className="hover:bg-blue-50/30 dark:hover:bg-white/5">
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        Payment Mode
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-lg px-2.5 py-1 font-medium ${
                            isModeChanged
                              ? "bg-rose-50 text-rose-700 line-through dark:bg-rose-500/10 dark:text-rose-300"
                              : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {request.oldPaymentMode || "Cash"}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center text-slate-400">
                        <ArrowRight className="h-3.5 w-3.5 mx-auto text-blue-500" />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-lg px-2.5 py-1 font-bold ${
                            isModeChanged
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                              : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {request.newPaymentMode || "Cash"}
                        </span>
                      </td>
                    </tr>

                    {/* Bank Name */}
                    <tr className="hover:bg-blue-50/30 dark:hover:bg-white/5">
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        Bank Name
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-lg px-2.5 py-1 font-medium ${
                            isBankChanged
                              ? "bg-rose-50 text-rose-700 line-through dark:bg-rose-500/10 dark:text-rose-300"
                              : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {request.oldBankName || <em className="text-slate-400 not-italic">None</em>}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center text-slate-400">
                        <ArrowRight className="h-3.5 w-3.5 mx-auto text-blue-500" />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-lg px-2.5 py-1 font-bold ${
                            isBankChanged
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                              : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {request.newBankName || <em className="text-slate-400 not-italic">None</em>}
                        </span>
                      </td>
                    </tr>

                    {/* Collected By */}
                    <tr className="hover:bg-blue-50/30 dark:hover:bg-white/5">
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        Collected By / Registrar
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-lg px-2.5 py-1 font-medium ${
                            isCollectorChanged
                              ? "bg-rose-50 text-rose-700 line-through dark:bg-rose-500/10 dark:text-rose-300"
                              : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {request.oldCollectedBy || "Staff"}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center text-slate-400">
                        <ArrowRight className="h-3.5 w-3.5 mx-auto text-blue-500" />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-lg px-2.5 py-1 font-bold ${
                            isCollectorChanged
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                              : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {request.newCollectedBy || "Staff"}
                        </span>
                      </td>
                    </tr>

                    {/* Invoice / Reference Number */}
                    <tr className="hover:bg-blue-50/30 dark:hover:bg-white/5">
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        Invoice / Tracking No
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-lg px-2.5 py-1 font-mono font-medium ${
                            isInvoiceChanged
                              ? "bg-rose-50 text-rose-700 line-through dark:bg-rose-500/10 dark:text-rose-300"
                              : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {request.oldInvoiceNumber || "-"}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center text-slate-400">
                        <ArrowRight className="h-3.5 w-3.5 mx-auto text-blue-500" />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-lg px-2.5 py-1 font-mono font-bold ${
                            isInvoiceChanged
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                              : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {request.newInvoiceNumber || "-"}
                        </span>
                      </td>
                    </tr>

                    {/* Remarks / Narration */}
                    <tr className="hover:bg-blue-50/30 dark:hover:bg-white/5">
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        Remarks / Narration
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-lg px-2.5 py-1 font-medium ${
                            isRemarksChanged
                              ? "bg-rose-50 text-rose-700 line-through dark:bg-rose-500/10 dark:text-rose-300"
                              : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {request.oldRemarks || <em className="text-slate-400 not-italic">None</em>}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center text-slate-400">
                        <ArrowRight className="h-3.5 w-3.5 mx-auto text-blue-500" />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-lg px-2.5 py-1 font-bold ${
                            isRemarksChanged
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                              : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {request.newRemarks || <em className="text-slate-400 not-italic">None</em>}
                        </span>
                      </td>
                    </tr>

                    {/* Image / Document Comparison */}
                    <tr className="hover:bg-blue-50/30 dark:hover:bg-white/5">
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        Image / Receipt
                      </td>
                      <td className="px-4 py-3">
                        {request.oldProofFileUrl ? (
                          <div className="space-y-2">
                            {isOldImage && (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={request.oldProofFileUrl}
                                alt="Old Image"
                                className="h-20 w-auto rounded-xl object-contain border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-slate-800"
                              />
                            )}
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewProofUrl(request.oldProofFileUrl);
                                  setPreviewProofTitle(
                                    request.oldProofFileName || "Old Proof Document"
                                  );
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 transition cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View Old Image
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No old file attached</span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-center text-slate-400">
                        <ArrowRight className="h-3.5 w-3.5 mx-auto text-blue-500" />
                      </td>
                      <td className="px-4 py-3">
                        {request.newProofFileUrl ? (
                          <div className="space-y-2">
                            {isNewImage && (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={request.newProofFileUrl}
                                alt="New Image"
                                className="h-20 w-auto rounded-xl object-contain border-2 border-emerald-500/50 bg-white p-1 dark:bg-slate-800"
                              />
                            )}
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewProofUrl(request.newProofFileUrl);
                                  setPreviewProofTitle(
                                    request.newProofFileName || "New Proof Document"
                                  );
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 transition cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View New Image
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No new file provided (keep old)</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Approver Optional Notes */}
            {isPending && canApprove && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Approval Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Enter any approval notes or verification details..."
                  value={approvalRemarks}
                  onChange={(e) => setApprovalRemarks(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 dark:border-white/10 dark:bg-slate-800 dark:text-white"
                />
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="shrink-0 flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-6 py-4 dark:border-white/10 dark:bg-slate-800/60">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl px-4 py-2 text-xs font-bold"
            >
              Cancel
            </Button>

            {isPending && (
              <div className="flex items-center gap-2.5">
                {canReject && (
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => {
                      onClose();
                      onOpenReject(request);
                    }}
                    disabled={submitting}
                    className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-4 py-2 text-xs font-bold shadow-md shadow-rose-500/20"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                )}

                {canApprove && (
                  <Button
                    type="button"
                    onClick={handleConfirmApprove}
                    disabled={submitting}
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5 py-2 text-xs font-bold shadow-md shadow-emerald-500/20"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {submitting ? "Approving..." : "Approve"}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Proof Preview Modal */}
      <TransactionProofViewer
        isOpen={Boolean(previewProofUrl)}
        proofUrl={previewProofUrl}
        proofTitle={previewProofTitle}
        onClose={() => setPreviewProofUrl(null)}
      />
    </>
  );
}
