"use client";

import React from "react";
import { ArrowUpRight, ArrowDownLeft, Wallet, TrendingUp, Layers } from "lucide-react";
import type { AccountStatementsData } from "../types/account-statements.types";

interface StatementTotalsProps {
  data: AccountStatementsData;
}

export const StatementTotals: React.FC<StatementTotalsProps> = ({ data }) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {/* Advances Total */}
      <div className="rounded-3xl border border-blue-100 bg-white p-4 shadow-xs dark:border-blue-900/30 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Advances (Cash)
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <Wallet className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 text-lg font-black text-blue-700 dark:text-blue-300">
          ₹{data.credit.advancesTotal.toLocaleString("en-IN")}
        </div>
        <div className="mt-0.5 text-[11px] text-slate-400">
          {data.credit.advances.length} cash entries
        </div>
      </div>

      {/* More Advances Total */}
      <div className="rounded-3xl border border-indigo-100 bg-white p-4 shadow-xs dark:border-indigo-900/30 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            More Advances
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <Layers className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 text-lg font-black text-indigo-700 dark:text-indigo-300">
          ₹{data.credit.moreAdvancesTotal.toLocaleString("en-IN")}
        </div>
        <div className="mt-0.5 text-[11px] text-slate-400">
          {data.credit.moreAdvances.length} bank/non-cash entries
        </div>
      </div>

      {/* Credit Total */}
      <div className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-xs dark:border-emerald-900/30 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Credit Total
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 text-lg font-black text-emerald-600 dark:text-emerald-400">
          ₹{data.credit.creditTotal.toLocaleString("en-IN")}
        </div>
        <div className="mt-0.5 text-[11px] text-slate-400">
          Total incoming funds
        </div>
      </div>

      {/* Debit Total */}
      <div className="rounded-3xl border border-rose-100 bg-white p-4 shadow-xs dark:border-rose-900/30 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Debit Total
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
            <ArrowDownLeft className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 text-lg font-black text-rose-600 dark:text-rose-400">
          ₹{data.debit.debitTotal.toLocaleString("en-IN")}
        </div>
        <div className="mt-0.5 text-[11px] text-slate-400">
          Total outgoing expenses
        </div>
      </div>

      {/* Cash In Hand */}
      <div className="rounded-3xl border border-teal-100 bg-linear-to-br from-teal-500 to-emerald-600 p-4 text-white shadow-md shadow-teal-500/20">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-teal-100">
            Cash In Hand
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/20 backdrop-blur-xs text-white">
            <TrendingUp className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 text-lg font-black tracking-tight text-white">
          ₹{data.cashInHand.toLocaleString("en-IN")}
        </div>
        <div className="mt-0.5 text-[11px] text-teal-100">
          Net operating cash
        </div>
      </div>
    </div>
  );
};
