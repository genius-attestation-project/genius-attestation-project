"use client";

import React, { useState } from "react";
import { Eye, Download, FileText, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDate, formatDateTime } from "@/utils/format";

export type AdvanceHistoryItem = {
  id: string;
  registrationId: string;
  trackingNumber: string;
  leadId?: string;
  customerName?: string;
  documentName?: string;
  totalAmount: number;
  advanceAmount: number;
  remainingBalance: number;
  paymentDate: string | Date;
  paymentMode: string;
  referenceNumber?: string | null;
  collectedBy?: string | null;
  remarks?: string | null;
  proofFileType?: string | null;
  receiptFileId?: string | null;
  receiptFileUrl?: string | null;
  receiptFileName?: string | null;
  status: string; // "Pending Approval" | "Approved" | "Rejected"
  requestedBy: string;
  requestedDate: string | Date;
  approvedBy?: string | null;
  approvedDate?: string | Date | null;
  rejectedBy?: string | null;
  rejectedDate?: string | Date | null;
  rejectionReason?: string | null;
};

type Props = {
  history: AdvanceHistoryItem[];
  loading?: boolean;
  onRefresh?: () => void;
};

function StatusBadge({ status }: { status: string }) {
  const isApproved = status === "Approved";
  const isRejected = status === "Rejected";

  let bgClass = "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50";
  let Icon = Clock;

  if (isApproved) {
    bgClass = "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50";
    Icon = CheckCircle2;
  } else if (isRejected) {
    bgClass = "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50";
    Icon = XCircle;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${bgClass}`}>
      <Icon size={12} />
      {status === "Pending Approval" ? "Pending" : status}
    </span>
  );
}

export function AdvanceHistoryTable({ history, loading = false, onRefresh }: Props) {
  const handleViewProof = (item: AdvanceHistoryItem) => {
    let url = item.receiptFileUrl;
    if (!url && item.receiptFileId) {
      url = `/api/files/${item.receiptFileId}/view`;
    }
    if (url) {
      window.open(url, "_blank");
    } else {
      alert("No proof file available.");
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 p-6 text-center text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
        Loading Advance Payment History...
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-6 text-center text-xs text-slate-400 dark:border-white/10 dark:bg-white/5">
        No advance payment history recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Advance Payment History ({history.length})
        </h3>
        {onRefresh && (
          <Button variant="ghost" size="sm" onClick={onRefresh} className="text-xs">
            Refresh History
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs dark:border-white/10 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:bg-white/5 dark:border-white/10 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Payment Mode</th>
              <th className="px-4 py-3">Ref Number</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Requested By</th>
              <th className="px-4 py-3">Approved / Rejected By</th>
              <th className="px-4 py-3">Remarks / Reason</th>
              <th className="px-4 py-3 text-right">Proof</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {history.map((item) => {
              const proofUrl = item.receiptFileUrl || (item.receiptFileId ? `/api/files/${item.receiptFileId}/view` : null);

              return (
                <tr key={item.id} className="transition hover:bg-slate-50/70 dark:hover:bg-white/5">
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                    {formatDate(item.paymentDate || item.requestedDate)}
                  </td>
                  <td className="px-4 py-3 font-extrabold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    ₹{item.advanceAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                    {item.paymentMode}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                    {item.referenceNumber || "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {item.requestedBy}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {item.status === "Approved" ? (
                      <span className="text-emerald-700 dark:text-emerald-300">
                        {item.approvedBy || "Admin"} ({item.approvedDate ? formatDate(item.approvedDate) : "-"})
                      </span>
                    ) : item.status === "Rejected" ? (
                      <span className="text-rose-700 dark:text-rose-300">
                        {item.rejectedBy || "Admin"} ({item.rejectedDate ? formatDate(item.rejectedDate) : "-"})
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                    {item.status === "Rejected" && item.rejectionReason ? (
                      <span className="font-semibold text-rose-600 dark:text-rose-400">
                        {item.rejectionReason}
                      </span>
                    ) : (
                      item.remarks || "-"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {proofUrl ? (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleViewProof(item)}
                          className="h-7 px-2 text-[11px] gap-1"
                        >
                          <Eye size={12} /> View Proof
                        </Button>
                        <a href={proofUrl} download target="_blank" rel="noreferrer">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Download Proof">
                            <Download size={12} />
                          </Button>
                        </a>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">No Proof</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
