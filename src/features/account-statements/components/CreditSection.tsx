"use client";

import React, { useMemo } from "react";
import { AdvanceTable } from "./AdvanceTable";
import { MoreAdvanceTable } from "./MoreAdvanceTable";
import type { AccountStatementItem, AccountStatementsData, CreditAccountGroup } from "../types/account-statements.types";
import { ArrowUpRight, Wallet, Edit2, Trash2, Image as ImageIcon, Download } from "lucide-react";

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
  const creditGroups: CreditAccountGroup[] = useMemo(() => {
    if (creditData.groups && creditData.groups.length > 0) {
      return creditData.groups;
    }
    if (creditData.panelCredits && creditData.panelCredits.length > 0) {
      const map = new Map<
        string,
        { accountName: string; accountHierarchy?: string[]; items: AccountStatementItem[] }
      >();
      for (const item of creditData.panelCredits) {
        const hierarchy =
          item.accountHierarchy && item.accountHierarchy.length > 0
            ? item.accountHierarchy
            : [item.accountName || "Credit Accounts"];
        const key = item.accountId || hierarchy.join(" > ");
        const name = item.accountName || hierarchy[hierarchy.length - 1] || "Credit Accounts";
        const existing = map.get(key) || {
          accountName: name,
          accountHierarchy: hierarchy,
          items: [],
        };
        existing.items.push(item);
        map.set(key, existing);
      }
      return Array.from(map.values()).map((g) => ({
        accountName: g.accountName,
        accountHierarchy: g.accountHierarchy,
        subTotal: g.items.reduce((sum, it) => sum + it.amount, 0),
        items: g.items.map((it, idx) => ({ ...it, slNo: idx + 1 })),
      }));
    }
    return [];
  }, [creditData.groups, creditData.panelCredits]);

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

      {/* Section 3: Account Panel Credit Groups */}
      {creditGroups.map((group) => (
        <div key={group.accountHierarchy?.join(" > ") || group.accountName} className="space-y-2">
          {/* Account Group Sub Header */}
          <div className="flex items-center justify-between bg-emerald-50/80 px-3 py-1.5 rounded-xl dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/30">
            <div className="flex flex-col py-0.5">
              {group.accountHierarchy && group.accountHierarchy.length > 1 ? (
                <div className="flex flex-col gap-0.5 text-xs">
                  {group.accountHierarchy.map((name, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      {idx > 0 && (
                        <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 font-bold select-none pl-1">
                          ↓
                        </span>
                      )}
                      <span
                        className={
                          idx === group.accountHierarchy!.length - 1
                            ? "font-extrabold uppercase tracking-wider text-emerald-900 dark:text-emerald-300"
                            : "font-semibold text-emerald-800/80 dark:text-emerald-400/80"
                        }
                      >
                        {name}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                  {group.accountName}
                </h4>
              )}
            </div>
            <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 shrink-0 self-center">
              Sub Total: ₹{group.subTotal.toLocaleString("en-IN")}
            </span>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-2xs dark:border-white/10 dark:bg-slate-900">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3 w-12 text-center">SI No</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Date</th>
                  <th className="py-2.5 px-3 min-w-[170px]">Item / Account</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Invoice No</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-center w-28">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {group.items.map((item, index) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-500">
                      {item.slNo ?? index + 1}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {item.date}
                    </td>
                    <td className="py-2.5 px-3 min-w-[170px]">
                      <div className="font-semibold text-slate-900 dark:text-white break-words">
                        {item.accountName || group.accountName}
                      </div>
                      {item.narration && item.narration !== item.accountName && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 break-words whitespace-pre-line mt-0.5">
                          {item.narration}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {item.invoiceNumber}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900 dark:text-white">
                      ₹{item.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {item.proofFileUrl && (
                          <>
                            <button
                              type="button"
                              onClick={() => onViewProof(item)}
                              title="View Proof"
                              className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/60 transition-all cursor-pointer"
                            >
                              <ImageIcon className="h-3.5 w-3.5" />
                            </button>
                            <a
                              href={item.proofFileUrl}
                              download
                              target="_blank"
                              rel="noreferrer"
                              title="Download Proof"
                              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 transition-all cursor-pointer"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          </>
                        )}
                        {item.canEdit !== false && (
                          <button
                            type="button"
                            onClick={() => onEdit(item)}
                            title="Edit"
                            className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/60 transition-all cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {item.canDelete !== false && (
                          <button
                            type="button"
                            onClick={() => onDelete(item)}
                            title="Delete"
                            className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/60 transition-all cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

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
