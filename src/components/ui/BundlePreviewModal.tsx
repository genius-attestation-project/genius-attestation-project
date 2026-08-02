"use client";

import React from "react";
import { X, Package, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { formatBundleNumber } from "@/utils/format";

export type BundlePreviewItemData = {
  slNo?: number;
  trackingNumber: string;
  registrationOffice?: string;
  deliveryAt?: string;
  collectedPerson?: string;
  documentName?: string;
  documentType?: string;
  processType?: string;
  mobileNumber?: string;
  expressPriority?: string;
  totalAmount?: number | string;
  advanceAmount?: number | string;
  balanceAmount?: number | string;
};

export type BundlePreviewModalProps = {
  open: boolean;
  onClose: () => void;
  onContinueReceive: () => void;
  bundleData: any; // Can be a Bundle object or single ProcessItem object
};

export function BundlePreviewModal({
  open,
  onClose,
  onContinueReceive,
  bundleData,
}: BundlePreviewModalProps) {
  if (!open || !bundleData) return null;

  // Extract bundle identifier / from office name
  const rawBundleNo = bundleData.bundleNumber || bundleData.trackingNumber || "-";
  const displayBundleNo = formatBundleNumber(rawBundleNo);
  const fromOfficeName = bundleData.fromOffice?.officeName || bundleData.fromOfficeName || bundleData.registeredOffice || "Origin Office";

  // Parse items into strict 13 fields list
  const rawItems: any[] = Array.isArray(bundleData.items) && bundleData.items.length > 0
    ? bundleData.items
    : [bundleData];

  const items = rawItems.map((item: any, idx: number) => {
    const reg = item.registration || item;
    const tot = Number(reg.totalCharges ?? reg.totalAmount ?? item.totalCharges ?? item.totalAmount ?? 0);
    const adv = Number(reg.advancePaid ?? item.advancePaid ?? 0);
    const bal = reg.balanceAmount !== undefined && reg.balanceAmount !== null
      ? Number(reg.balanceAmount)
      : Math.max(0, tot - adv);

    return {
      slNo: idx + 1,
      trackingNumber: item.trackingNumber || reg.trackingNumber || "-",
      registrationOffice: reg.regionOfRegistration || reg.registeredOffice || item.registeredOffice || item.fromOfficeName || "-",
      deliveryAt: reg.deliveryLocation || item.deliveryLocation || "-",
      collectedPerson: reg.collectedPerson || item.collectedPerson || "-",
      documentName: reg.documentName || reg.customerName || item.customerName || item.clientName || "-",
      documentType: reg.documentType || item.documentType || "-",
      processType: reg.processType || reg.mainProcess || reg.externalProcess || item.processType || item.mainProcess || "-",
      mobileNumber: reg.mobile || reg.mobileNumber || item.mobile || "-",
      expressPriority: reg.priority || item.priority || "Normal",
      totalAmount: tot,
      advanceAmount: adv,
      balanceAmount: bal,
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="flex flex-col w-full max-w-4xl max-h-[90vh] rounded-3xl bg-white shadow-2xl dark:bg-[#0f1115] border border-slate-200 dark:border-white/10 overflow-hidden">
        
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
          {items.map((doc) => (
            <div
              key={doc.slNo}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-[#12151c] space-y-5"
            >
              {/* 1. Bundle / Movement Overview Section */}
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-white/10">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-blue-900 dark:text-blue-400">
                    Bundle Information Overview
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      SL No: <span className="font-mono text-slate-900 dark:text-white font-bold">{doc.slNo}</span>
                    </span>
                    <PriorityBadge priority={doc.expressPriority} />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block">Tracking Number</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                      {doc.trackingNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Registration Office</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {doc.registrationOffice}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Delivery At</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {doc.deliveryAt}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Collection Of</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {doc.collectedPerson}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Mobile Number</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {doc.mobileNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Express Priority</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {doc.expressPriority}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Document Information Section */}
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 dark:border-white/10 dark:text-slate-300">
                  Document Information
                </h3>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block">Document Name</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {doc.documentName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Document Type</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {doc.documentType}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Process Type</span>
                    <span className="font-bold text-blue-800 dark:text-blue-300">
                      {doc.processType}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Payment Information Section */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-white/10 dark:bg-white/5 space-y-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 border-b border-slate-200/60 pb-1.5 dark:border-white/10">
                  Payment Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-2 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block">Total Amount</span>
                    <span className="font-bold text-blue-700 dark:text-blue-400 text-sm">
                      ₹{doc.totalAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Advance Amount</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      ₹{doc.advanceAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Balance Amount</span>
                    <span className={`font-bold text-sm ${doc.balanceAmount > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-300"}`}>
                      ₹{doc.balanceAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="shrink-0 flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="rounded-xl px-5"
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={() => {
              onClose();
              onContinueReceive();
            }}
            className="gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 shadow-md shadow-emerald-600/20"
          >
            <span>Continue Receive</span>
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
