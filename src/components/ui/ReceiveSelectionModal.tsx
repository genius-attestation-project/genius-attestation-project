"use client";

import React, { useState, useEffect } from "react";
import { X, CheckCircle2, CheckSquare, Square, Inbox } from "lucide-react";
import { Button } from "@/components/ui/Button";

export type ReceiveSelectionModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirmReceive: (selectedTrackingNumbers: string[]) => void | Promise<void>;
  bundleData: any;
  isReceiving?: boolean;
};

export function ReceiveSelectionModal({
  open,
  onClose,
  onConfirmReceive,
  bundleData,
  isReceiving = false,
}: ReceiveSelectionModalProps) {
  const [selectedTrackings, setSelectedTrackings] = useState<string[]>([]);

  // Parse items into strict document selection list
  const rawItems: any[] = bundleData && Array.isArray(bundleData.items) && bundleData.items.length > 0
    ? bundleData.items
    : bundleData ? [bundleData] : [];

  const documents = rawItems.map((item: any, idx: number) => {
    const reg = item.registration || item;

    return {
      slNo: idx + 1,
      trackingNumber: item.trackingNumber || reg.trackingNumber || "-",
      registrationOffice: reg.regionOfRegistration || reg.registeredOffice || item.registeredOffice || "-",
      documentName: reg.documentName || reg.customerName || item.customerName || item.clientName || "-",
      documentType: reg.documentType || item.documentType || "-",
      processType: reg.processType || reg.mainProcess || reg.externalProcess || item.processType || item.mainProcess || "-",
    };
  });

  // Default all documents to selected when modal opens
  useEffect(() => {
    if (open && documents.length > 0) {
      setSelectedTrackings(documents.map((d) => d.trackingNumber));
    } else {
      setSelectedTrackings([]);
    }
  }, [open, bundleData]);

  if (!open || !bundleData) return null;

  const toggleSelect = (trackingNumber: string) => {
    setSelectedTrackings((prev) =>
      prev.includes(trackingNumber)
        ? prev.filter((t) => t !== trackingNumber)
        : [...prev, trackingNumber]
    );
  };

  const toggleSelectAll = () => {
    if (selectedTrackings.length === documents.length) {
      setSelectedTrackings([]);
    } else {
      setSelectedTrackings(documents.map((d) => d.trackingNumber));
    }
  };

  const handleReceive = () => {
    if (selectedTrackings.length === 0) return;
    onConfirmReceive(selectedTrackings);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="flex flex-col w-full max-w-5xl max-h-[90vh] rounded-3xl bg-white shadow-2xl dark:bg-[#0f1115] border border-slate-200 dark:border-white/10 overflow-hidden">
        
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white font-bold shrink-0">
              <Inbox className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Receive Documents
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select documents to receive ({selectedTrackings.length} of {documents.length} selected)
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

        {/* Scrollable Table Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12151c]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 dark:bg-white/5 font-extrabold tracking-wider text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="p-3.5 w-12 text-center">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="inline-flex items-center justify-center text-slate-600 dark:text-slate-300"
                    >
                      {selectedTrackings.length === documents.length && documents.length > 0 ? (
                        <CheckSquare className="h-4.5 w-4.5 text-emerald-600" />
                      ) : (
                        <Square className="h-4.5 w-4.5 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="p-3.5 w-16 text-center">SL No.</th>
                  <th className="p-3.5">Tracking Number</th>
                  <th className="p-3.5">Registration Office</th>
                  <th className="p-3.5">Document Name</th>
                  <th className="p-3.5">Document Type</th>
                  <th className="p-3.5">Process Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {documents.map((doc) => {
                  const isChecked = selectedTrackings.includes(doc.trackingNumber);
                  return (
                    <tr
                      key={doc.trackingNumber}
                      onClick={() => toggleSelect(doc.trackingNumber)}
                      className={`cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-emerald-50/40 dark:bg-emerald-950/20"
                          : "hover:bg-slate-50 dark:hover:bg-white/5"
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <span className="inline-flex items-center justify-center">
                          {isChecked ? (
                            <CheckSquare className="h-4.5 w-4.5 text-emerald-600" />
                          ) : (
                            <Square className="h-4.5 w-4.5 text-slate-400" />
                          )}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-slate-500">{doc.slNo}</td>
                      <td className="p-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {doc.trackingNumber}
                      </td>
                      <td className="p-3.5 font-medium text-slate-700 dark:text-slate-300">
                        {doc.registrationOffice}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        {doc.documentName}
                      </td>
                      <td className="p-3.5 font-medium text-slate-700 dark:text-slate-300">
                        {doc.documentType}
                      </td>
                      <td className="p-3.5 font-bold text-blue-800 dark:text-blue-300">
                        {doc.processType}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="shrink-0 flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isReceiving}
            className="rounded-xl px-5"
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={handleReceive}
            disabled={selectedTrackings.length === 0 || isReceiving}
            className="gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 shadow-md shadow-emerald-600/20 disabled:opacity-50"
          >
            <CheckCircle2 size={16} />
            <span>{isReceiving ? "Receiving..." : `Receive (${selectedTrackings.length})`}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
