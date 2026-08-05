"use client";

import React from "react";
import { X, Package } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDate, formatBundleNumber } from "@/utils/format";
import { calculateNumberOfDays } from "@/utils/days-calculator";

export type BundlePreviewItemData = {
  slNo: number;
  trackingNumber: string;
  registrationDate: string;
  documentName: string;
  documentType: string;
  processType: string;
  numberOfDays: string;
};

export type BundlePreviewModalProps = {
  open: boolean;
  onClose: () => void;
  onContinueReceive?: () => void;
  bundleData: any; // Can be a Bundle object or single ProcessItem object
};

export function BundlePreviewModal({
  open,
  onClose,
  bundleData,
}: BundlePreviewModalProps) {
  if (!open || !bundleData) return null;

  // Extract bundle identifier / from office name
  const rawBundleNo = bundleData.bundleNumber || bundleData.trackingNumber || "-";
  const displayBundleNo = formatBundleNumber(rawBundleNo);
  const fromOfficeName =
    bundleData.fromOffice?.officeName ||
    bundleData.fromOfficeName ||
    bundleData.registeredOffice ||
    "Origin Office";

  // Parse items into strict 7 fields list
  const rawItems: any[] =
    Array.isArray(bundleData.items) && bundleData.items.length > 0
      ? bundleData.items
      : [bundleData];

  const items: BundlePreviewItemData[] = rawItems.map((item: any, idx: number) => {
    const reg = item.registration || item;
    return {
      slNo: idx + 1,
      trackingNumber: item.trackingNumber || reg?.trackingNumber || "-",
      registrationDate: formatDate(
        reg?.createdDate || reg?.createdAt || item.registrationDate || item.createdAt
      ),
      documentName:
        reg?.documentName ||
        reg?.customerName ||
        item.documentName ||
        item.customerName ||
        item.clientName ||
        "-",
      documentType: reg?.documentType || item.documentType || "-",
      processType:
        reg?.processType ||
        reg?.mainProcess ||
        reg?.externalProcess ||
        item.processType ||
        item.mainProcess ||
        "-",
      numberOfDays: calculateNumberOfDays(
        item.receivedAt || item.updatedAt || item.createdAt || reg?.createdAt
      ),
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="flex flex-col w-full max-w-5xl max-h-[90vh] rounded-3xl bg-white shadow-2xl dark:bg-[#0f1115] border border-slate-200 dark:border-white/10 overflow-hidden">
        
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white font-bold shrink-0">
              <Package className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Bundle Information Preview
                </h2>
                <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-mono font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  Bundle #{displayBundleNo}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                From: <span className="font-semibold text-slate-700 dark:text-slate-200">{fromOfficeName}</span> • Total Documents: {items.length}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 shadow-xs">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="border-b border-slate-200 bg-slate-100/80 uppercase font-extrabold tracking-wider text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3.5 w-16">SL No</th>
                  <th className="px-4 py-3.5">Tracking Number</th>
                  <th className="px-4 py-3.5">Registration Date</th>
                  <th className="px-4 py-3.5">Document Name</th>
                  <th className="px-4 py-3.5">Document Type</th>
                  <th className="px-4 py-3.5">Process Type</th>
                  <th className="px-4 py-3.5">Number Of Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10 bg-white dark:bg-[#12151c]">
                {items.map((doc) => (
                  <tr key={doc.slNo} className="hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-600 dark:text-slate-400">{doc.slNo}</td>
                    <td className="px-4 py-3.5 font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                      {doc.trackingNumber}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-800 dark:text-slate-200">
                      {doc.registrationDate}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                      {doc.documentName}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                      {doc.documentType}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-blue-800 dark:text-blue-300">
                      {doc.processType}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-amber-700 dark:text-amber-400">
                      {doc.numberOfDays}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Grid View */}
          <div className="md:hidden space-y-4">
            {items.map((doc) => (
              <div
                key={doc.slNo}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-[#12151c] space-y-3 text-xs"
              >
                <div>
                  <span className="text-slate-400 font-medium block">SL No:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{doc.slNo}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Tracking Number:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                    {doc.trackingNumber}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Registration Date:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {doc.registrationDate}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Document Name:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {doc.documentName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Document Type:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {doc.documentType}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Process Type:</span>
                  <span className="font-bold text-blue-800 dark:text-blue-300">
                    {doc.processType}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Number Of Days:</span>
                  <span className="font-bold text-amber-700 dark:text-amber-400">
                    {doc.numberOfDays}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="shrink-0 flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="rounded-xl px-5 font-semibold"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

