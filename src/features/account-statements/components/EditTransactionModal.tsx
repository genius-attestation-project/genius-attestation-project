"use client";

import React, { useState, useEffect } from "react";
import { X, Save, Edit3, Eye, RefreshCw, Upload, FileText, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import type { AccountStatementItem } from "../types/account-statements.types";
import { TransactionProofViewer } from "./TransactionProofViewer";

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
  const [bankName, setBankName] = useState<string>("");
  const [collectedBy, setCollectedBy] = useState<string>("");
  const [narration, setNarration] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");

  // Existing file state
  const [existingProofUrl, setExistingProofUrl] = useState<string | null>(null);
  const [existingProofName, setExistingProofName] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // New replacement file state
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newFileId, setNewFileId] = useState<string | null>(null);
  const [newFileUrl, setNewFileUrl] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isReplacingFile, setIsReplacingFile] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setAmount(item.amount);
      setDate(item.date);
      setPaymentMode(item.paymentMode || "Cash");
      setBankName(item.bankName || "");
      setCollectedBy(item.collectedBy || "");
      setNarration(item.narration || item.remarks || "");
      setInvoiceNumber(item.invoiceNumber || item.trackingNumber || "");
      
      const proofUrl = item.proofFileUrl || item.bankProofFileUrl || null;
      const proofName = item.proofFileName || item.bankProofFileName || (proofUrl ? "Proof Document" : null);
      setExistingProofUrl(proofUrl);
      setExistingProofName(proofName);

      setNewFile(null);
      setNewFileId(null);
      setNewFileUrl(null);
      setNewFileName(null);
      setIsReplacingFile(false);
      setError(null);
      setSuccessMessage(null);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNewFile(file);
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("module", "account_statements");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Upload failed");
      }

      setNewFileId(data.id || data.fileStorageId);
      setNewFileUrl(data.url || (data.id ? `/api/files/${data.id}/view` : URL.createObjectURL(file)));
      setNewFileName(file.name);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err?.message || "Failed to upload image/document.");
      setNewFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveNewFile = () => {
    setNewFile(null);
    setNewFileId(null);
    setNewFileUrl(null);
    setNewFileName(null);
    if (existingProofUrl) {
      setIsReplacingFile(false);
    }
  };

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
          bankName: bankName.trim() || undefined,
          collectedBy: collectedBy.trim() || undefined,
          narration,
          remarks: narration,
          invoiceNumber,
          referenceNumber: invoiceNumber,
          newProofFileId: newFileId || undefined,
          newProofFileUrl: newFileUrl || undefined,
          newProofFileName: newFileName || undefined,
          bankProofFileId: newFileId || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || json.message || "Failed to submit transaction edit.");
      }

      setSuccessMessage("Transaction edit submitted for approval.");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 800);
    } catch (err: any) {
      setError(err?.message || "Failed to submit transaction edit.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900 overflow-hidden">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-5 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900">
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
                  {item.officeName ? ` · ${item.officeName}` : ""}
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

          {/* Form Body with Scroll */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Info Callout */}
            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-3 text-xs text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
              <span>
                Edits will be submitted as an <strong>Account Approval</strong> request. The original transaction will update upon authorized approval.
              </span>
            </div>

            {error && (
              <div className="rounded-2xl bg-red-50 p-3 text-xs font-semibold text-red-600 dark:bg-red-950/60 dark:text-red-300">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="rounded-2xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <form id="edit-tx-form" onSubmit={handleSubmit} className="space-y-4">
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

                  {/* Bank Name (for Non-Cash) */}
                  {paymentMode !== "Cash" && (
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={bankName}
                        placeholder="e.g. State Bank of India"
                        onChange={(e) => setBankName(e.target.value)}
                        className="mt-1 w-full rounded-2xl border border-slate-200/80 bg-slate-50/60 px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white"
                      />
                    </div>
                  )}

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
                  rows={2}
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200/80 bg-slate-50/60 px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </div>

              {/* Uploaded Image / Document Section */}
              <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-white/10">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Transaction Receipt / Document Image
                </label>

                {/* Case 1: Existing File Display (when not replacing and no new file selected) */}
                {existingProofUrl && !isReplacingFile && !newFile && (
                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                          {existingProofName || "Uploaded Receipt Document"}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Existing attached file
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewOpen(true)}
                        className="inline-flex items-center gap-1 rounded-xl bg-white px-2.5 py-1 text-xs font-bold text-blue-600 shadow-2xs hover:bg-blue-50 dark:bg-white/10 dark:text-blue-300 dark:hover:bg-white/20 transition cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsReplacingFile(true)}
                        className="inline-flex items-center gap-1 rounded-xl bg-white px-2.5 py-1 text-xs font-bold text-slate-600 shadow-2xs hover:bg-slate-100 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20 transition cursor-pointer"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Replace
                      </button>
                    </div>
                  </div>
                )}

                {/* Case 2: New File Selected / Uploading */}
                {newFile && (
                  <div className="flex items-center justify-between rounded-2xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/40 dark:bg-blue-950/20">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                        <Upload className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                          {newFile.name}
                        </p>
                        <p className="text-[10px] text-blue-600 dark:text-blue-400">
                          {uploading ? "Uploading..." : "New replacement file selected"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {newFileUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewOpen(true)}
                          className="inline-flex items-center gap-1 rounded-xl bg-white px-2.5 py-1 text-xs font-bold text-blue-600 shadow-2xs hover:bg-blue-50 dark:bg-white/10 dark:text-blue-300 transition cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Preview
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleRemoveNewFile}
                        className="rounded-xl p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Case 3: File Input (when no file or when user clicked Replace) */}
                {(!existingProofUrl || isReplacingFile) && !newFile && (
                  <div className="space-y-1.5">
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-4 transition hover:border-blue-400 hover:bg-blue-50 dark:border-blue-800/40 dark:bg-blue-950/20 dark:hover:border-blue-700">
                      <Upload className="h-5 w-5 text-blue-500 mb-1" />
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                        {existingProofUrl ? "Select replacement image / document" : "Upload transaction receipt / document"}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        JPG, PNG, WEBP, PDF (Max 10MB)
                      </span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    {existingProofUrl && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setIsReplacingFile(false)}
                          className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                        >
                          Cancel replacement & keep existing file
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* Form Action Footer */}
          <div className="shrink-0 flex items-center justify-end gap-2 p-4 border-t border-slate-100 bg-slate-50/80 dark:border-white/10 dark:bg-slate-900">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-white cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              form="edit-tx-form"
              disabled={saving || uploading}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 cursor-pointer disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Submitting..." : "Submit for Approval"}
            </button>
          </div>
        </div>
      </div>

      {/* Proof Preview Modal */}
      <TransactionProofViewer
        isOpen={previewOpen}
        proofUrl={newFileUrl || existingProofUrl}
        proofTitle={newFileName || existingProofName || "Transaction Document"}
        onClose={() => setPreviewOpen(false)}
      />
    </>
  );
};
