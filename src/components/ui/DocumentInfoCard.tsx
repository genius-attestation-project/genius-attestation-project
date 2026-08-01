"use client";

import React from "react";
import { PriorityBadge } from "./PriorityBadge";

export type DocumentInfoCardData = {
  id?: string;
  trackingNumber: string;
  priority?: string;
  status?: string;
  customerName?: string;
  mobile?: string;
  country?: string;
  service?: string;
  documentType?: string;
  processType?: string;
  mainProcess?: string;
  subPackage?: string;
  registeredOffice?: string;
  currentOffice?: string;
  deliveryLocation?: string;
  registeredDate?: string;
  updatedAt?: string | Date;
  // Financial
  totalAmount?: number;
  totalCharges?: number | string;
  advanceAmount?: number;
  advancePaid?: number | string;
  balanceAmount?: number | string;
  paymentStatus?: string;
  paymentMode?: string;
  currency?: string;
  // Workflow
  currentStage?: string;
  currentDepartment?: string;
  currentAssignedOffice?: string;
  bundleNumber?: string;
  transferDate?: string;
  receivedDate?: string;
  completedDate?: string;
  returnStatus?: string;
  rejectStatus?: string;
};

export type DocumentInfoCardProps = {
  document: DocumentInfoCardData;
  compact?: boolean;
  className?: string;
  showFinancials?: boolean;
  showWorkflow?: boolean;
  onClick?: () => void;
  actionButton?: React.ReactNode;
};

export function DocumentInfoCard({
  document,
  compact = false,
  className = "",
  showFinancials = true,
  showWorkflow = true,
  onClick,
  actionButton,
}: DocumentInfoCardProps) {
  const tNum = document.trackingNumber || "N/A";
  const custName = document.customerName || "-";
  const mob = document.mobile || "-";
  const ctry = document.country || "-";
  const docType = document.documentType || "-";
  const srv = document.service || document.processType || "-";
  const mainProc = document.mainProcess || document.processType || "-";
  const subPkg = document.subPackage || "-";
  const regOffice = document.registeredOffice || "-";
  const currOffice = document.currentOffice || document.currentAssignedOffice || "-";
  const delLoc = document.deliveryLocation || "-";
  const regDate = document.registeredDate || "-";
  const updatedDate = document.updatedAt
    ? typeof document.updatedAt === "string"
      ? document.updatedAt
      : new Date(document.updatedAt).toLocaleDateString()
    : "-";

  // Financial Calculations
  const totAmt =
    document.totalAmount !== undefined
      ? document.totalAmount
      : document.totalCharges !== undefined
      ? Number(document.totalCharges)
      : 0;
  const advAmt =
    document.advanceAmount !== undefined
      ? document.advanceAmount
      : document.advancePaid !== undefined
      ? Number(document.advancePaid)
      : 0;
  const balAmt =
    document.balanceAmount !== undefined
      ? Number(document.balanceAmount)
      : Math.max(0, totAmt - advAmt);

  const pStatus =
    document.paymentStatus ||
    (balAmt <= 0 && totAmt > 0
      ? "Paid"
      : advAmt > 0
      ? "Partially Paid"
      : "Pending");
  const pMode = document.paymentMode || "-";
  const currSymbol = document.currency || "₹";

  // Workflow fields
  const currStage = document.currentStage || document.status || "In Progress";
  const currDept = document.currentDepartment || "Process Department";
  const bundleNo = document.bundleNumber || "-";
  const transDate = document.transferDate || "-";
  const recvDate = document.receivedDate || "-";

  const renderStatusBadge = (status?: string) => {
    const st = (status || "Pending").toLowerCase();
    if (st.includes("in hand") || st.includes("received") || st.includes("completed")) {
      return (
        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
          Status : {status || "In Hand"}
        </span>
      );
    }
    if (st.includes("transfer") || st.includes("outbound")) {
      return (
        <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-bold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40">
          Status : {status}
        </span>
      );
    }
    if (st.includes("reject")) {
      return (
        <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40">
          Status : {status}
        </span>
      );
    }
    if (st.includes("return")) {
      return (
        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
          Status : {status}
        </span>
      );
    }
    return (
      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
        Status : {status || "Pending"}
      </span>
    );
  };

  const renderPaymentBadge = (status: string) => {
    const st = status.toLowerCase();
    if (st.includes("paid") && !st.includes("partially") && !st.includes("partial")) {
      return (
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/40">
          Paid
        </span>
      );
    }
    if (st.includes("partial")) {
      return (
        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/40">
          Partially Paid
        </span>
      );
    }
    if (st.includes("overdue")) {
      return (
        <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-800 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/40">
          Overdue
        </span>
      );
    }
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/40">
        {status || "Pending"}
      </span>
    );
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-slate-200 bg-white p-4 text-xs shadow-xs dark:border-white/10 dark:bg-[#0f1115] space-y-3 transition-all ${
        onClick ? "cursor-pointer hover:border-blue-400 hover:shadow-md" : ""
      } ${className}`}
    >
      {/* Header Line */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-white/10">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm sm:text-base">
            Tracking Number : {tNum}
          </span>
          <PriorityBadge priority={document.priority} />
          {subPkg !== "-" && (
            <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              {subPkg}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {renderStatusBadge(document.status)}
          {actionButton}
        </div>
      </div>

      {/* Document Information Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
        <div>
          <span className="text-slate-400 font-medium">Customer : </span>
          <span className="font-bold text-slate-900 dark:text-white">{custName}</span>
        </div>
        <div>
          <span className="text-slate-400 font-medium">Mobile : </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{mob}</span>
        </div>
        <div>
          <span className="text-slate-400 font-medium">Country : </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{ctry}</span>
        </div>
        <div>
          <span className="text-slate-400 font-medium">Document Type : </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{docType}</span>
        </div>
        <div>
          <span className="text-slate-400 font-medium">Service : </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{srv}</span>
        </div>
        <div>
          <span className="text-slate-400 font-medium">Main Process : </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{mainProc}</span>
        </div>
        <div>
          <span className="text-slate-400 font-medium">Registered Office : </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{regOffice}</span>
        </div>
        <div>
          <span className="text-slate-400 font-medium">Current Office : </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{currOffice}</span>
        </div>
        <div>
          <span className="text-slate-400 font-medium">Delivery Location : </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{delLoc}</span>
        </div>
        <div>
          <span className="text-slate-400 font-medium">Registered Date : </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{regDate}</span>
        </div>
        <div>
          <span className="text-slate-400 font-medium">Last Updated : </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{updatedDate}</span>
        </div>
      </div>

      {/* Financial Information Section */}
      {showFinancials && (
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/5 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5 dark:border-white/10">
            <span className="font-bold text-[11px] uppercase tracking-wider text-slate-700 dark:text-slate-200">
              Financial Information
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-medium">Payment Status:</span>
              {renderPaymentBadge(pStatus)}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1.5 text-[11px]">
            <div>
              <span className="text-slate-400 font-medium">Total Amount : </span>
              <span className="font-bold text-blue-700 dark:text-blue-400">
                {currSymbol} {totAmt.toLocaleString("en-IN")}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Advance Amount : </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {currSymbol} {advAmt.toLocaleString("en-IN")}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Balance Amount : </span>
              <span
                className={`font-bold ${
                  balAmt > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-300"
                }`}
              >
                {currSymbol} {balAmt.toLocaleString("en-IN")}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Payment Mode : </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{pMode}</span>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Information Section */}
      {showWorkflow && !compact && (
        <div className="rounded-xl border border-slate-200/60 bg-slate-50/40 p-2.5 dark:border-white/10 dark:bg-white/5 text-[11px] space-y-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-slate-600 dark:text-slate-400">
            <div>
              <span className="text-slate-400 font-medium">Stage : </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{currStage}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Department : </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{currDept}</span>
            </div>
            {bundleNo !== "-" && (
              <div>
                <span className="text-slate-400 font-medium">Bundle No : </span>
                <span className="font-mono font-bold text-blue-600">{bundleNo}</span>
              </div>
            )}
            {transDate !== "-" && (
              <div>
                <span className="text-slate-400 font-medium">Transfer Date : </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{transDate}</span>
              </div>
            )}
            {recvDate !== "-" && (
              <div>
                <span className="text-slate-400 font-medium">Received Date : </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{recvDate}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
