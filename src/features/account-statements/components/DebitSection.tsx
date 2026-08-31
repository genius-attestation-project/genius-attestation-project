"use client";

import React from "react";
import { ArrowDownLeft, Edit2, Trash2, Image as ImageIcon, Download } from "lucide-react";
import type { AccountStatementItem, DebitAccountGroup } from "../types/account-statements.types";

interface DebitSectionProps {
  groups: DebitAccountGroup[];
  debitTotal: number;
  onViewProof: (item: AccountStatementItem) => void;
  onEdit: (item: AccountStatementItem) => void;
  onDelete: (item: AccountStatementItem) => void;
}

export const DebitSection: React.FC<DebitSectionProps> = ({
  groups,
  debitTotal,
  onViewProof,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-slate-900">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
            <ArrowDownLeft className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Debit (Outgoing / Payments)
            </h3>
          </div>
        </div>

        <div className="text-xs font-bold text-rose-600 dark:text-rose-400">
          Debit Total:{" "}
          <span className="font-black text-rose-700 dark:text-rose-300">
            ₹{debitTotal.toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400 dark:border-white/10 dark:text-slate-500">
          No debit transactions recorded in this period.
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.accountName} className="space-y-2">
            {/* Account Group Sub Header */}
            <div className="flex items-center justify-between bg-slate-100/80 px-3 py-1.5 rounded-xl dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {group.accountName}
              </h4>
              <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                Sub Total: ₹{group.subTotal.toLocaleString("en-IN")}
              </span>
            </div>

            {/* Account Group Items Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-2xs dark:border-white/10 dark:bg-slate-900">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/80 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3 w-12 text-center">SI No</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Date</th>
                    <th className="py-2.5 px-3">Item / Account</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Invoice No</th>
                    <th className="py-2.5 px-3 text-right">Amount Bill</th>
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
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {item.accountName || group.accountName}
                        </div>
                        {item.narration && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                            {item.narration}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {item.invoiceNumber}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-rose-600 dark:text-rose-400">
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
                          <button
                            type="button"
                            onClick={() => onEdit(item)}
                            title="Edit"
                            className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/60 transition-all cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(item)}
                            title="Delete"
                            className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/60 transition-all cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {/* Footer Total */}
      <div className="flex items-center justify-between rounded-2xl bg-rose-50 p-3.5 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40">
        <span className="text-xs font-black uppercase tracking-wider text-rose-900 dark:text-rose-300">
          Debit Total
        </span>
        <span className="text-sm font-black text-rose-700 dark:text-rose-300">
          ₹{debitTotal.toLocaleString("en-IN")}
        </span>
      </div>
    </div>
  );
};
