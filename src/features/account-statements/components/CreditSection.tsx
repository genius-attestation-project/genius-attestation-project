"use client";

import React from "react";
import { AdvanceTable } from "./AdvanceTable";
import { MoreAdvanceTable } from "./MoreAdvanceTable";
import type { AccountStatementItem, AccountStatementsData } from "../types/account-statements.types";
import { ArrowUpRight, Wallet } from "lucide-react";

interface CreditSectionProps {
  creditData: AccountStatementsData["credit"];
  openingBalance: number;
  cashInHand: number;
  onViewProof: (item: AccountStatementItem) => void;
  onEdit: (item: AccountStatementItem) => void;
  onDelete: (item: AccountStatementItem) => void;
}

export const CreditSection: React.FC<CreditSectionProps> = ({
  creditData,
  openingBalance,
  cashInHand,
  onViewProof,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-slate-900">
      {/* Header Banner */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <ArrowUpRight className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Credit (Money Received)
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-bold text-slate-600 dark:text-slate-400">
            Credit Opening Balance:{" "}
            <span className="font-black text-slate-900 dark:text-white">
              ₹{openingBalance.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      {/* Section 1: Advances (Cash) */}
      <AdvanceTable
        items={creditData.advances}
        total={creditData.advancesTotal}
        onViewProof={onViewProof}
        onEdit={onEdit}
        onDelete={onDelete}
      />

      {/* Section 2: More Advances (Non-Cash) */}
      <MoreAdvanceTable
        items={creditData.moreAdvances}
        total={creditData.moreAdvancesTotal}
        onViewProof={onViewProof}
        onEdit={onEdit}
        onDelete={onDelete}
      />

      {/* Credit Summary Total Footer */}
      <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3.5 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
        <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Credit Total
        </span>
        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
          ₹{creditData.creditTotal.toLocaleString("en-IN")}
        </span>
      </div>

      {/* Bottom Cash In Hand Box */}
      <div className="flex items-center justify-between rounded-2xl bg-linear-to-r from-emerald-500 to-teal-600 p-4 text-white shadow-md shadow-emerald-500/20">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-xs">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-100">
              Cash In Hand (Net Balance)
            </div>
            <div className="text-xs font-medium text-emerald-50">
              Net balance available
            </div>
          </div>
        </div>

        <div className="text-xl font-black tracking-tight">
          ₹{cashInHand.toLocaleString("en-IN")}
        </div>
      </div>
    </div>
  );
};
