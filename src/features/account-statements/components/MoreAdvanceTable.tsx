"use client";

import React from "react";
import { Eye, Edit2, Trash2, Image as ImageIcon } from "lucide-react";
import type { AccountStatementItem } from "../types/account-statements.types";

interface MoreAdvanceTableProps {
  items: AccountStatementItem[];
  total: number;
  onViewProof: (item: AccountStatementItem) => void;
  onEdit: (item: AccountStatementItem) => void;
  onDelete: (item: AccountStatementItem) => void;
}

export const MoreAdvanceTable: React.FC<MoreAdvanceTableProps> = ({
  items,
  total,
  onViewProof,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between bg-indigo-50/80 px-3 py-1.5 rounded-xl dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/30">
        <h4 className="text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
          More Advances (Bank Transfer & Non-Cash)
        </h4>
        <span className="text-xs font-black text-indigo-700 dark:text-indigo-300">
          Total: ₹{total.toLocaleString("en-IN")}
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-2xs dark:border-white/10 dark:bg-slate-900">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/80 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
              <th className="py-2.5 px-3 w-12 text-center">SI No</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Date</th>
              <th className="py-2.5 px-3">Added By / Collected By</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Invoice No</th>
              <th className="py-2.5 px-3 text-right">Amount</th>
              <th className="py-2.5 px-3 text-center w-28">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-400 dark:text-slate-500 italic">
                  No non-cash advances recorded in this period.
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
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
                  <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white uppercase tracking-tight">
                    {item.collectedBy}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                    {item.invoiceNumber}
                  </td>
                  <td className="py-2.5 px-3 text-right font-black text-slate-900 dark:text-white">
                    ₹{item.amount.toLocaleString("en-IN")}
                  </td>
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      {item.proofFileUrl && (
                        <button
                          type="button"
                          onClick={() => onViewProof(item)}
                          title="View Proof"
                          className="rounded-lg p-1.5 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/60 transition-all cursor-pointer"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                        </button>
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
              ))
            )}
          </tbody>
          {items.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50/90 font-black dark:border-white/10 dark:bg-white/5">
                <td colSpan={4} className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                  Sub Total (More Advances):
                </td>
                <td className="py-2.5 px-3 text-right text-indigo-700 dark:text-indigo-300">
                  ₹{total.toLocaleString("en-IN")}
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};
