"use client";

import { Search, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { DashboardCard } from "@/components/ui/DashboardCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { LeadRow } from "@/features/lead/types/lead.types";
import { cn } from "@/utils/cn";

const statusStyles: Record<string, string> = {
  CLOSED: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20",
  LOB: "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-200 dark:ring-blue-500/20",
  FOLLOWUP: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/20",
  PENDING_APPROVAL: "bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-500/10 dark:text-violet-200 dark:ring-violet-500/20",
};

function formatStatus(status: string) {
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function DashboardTables({ rows }: { rows: LeadRow[] }) {
  const [query, setQuery] = useState("");
  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return rows;
    }

    return rows.filter((row) =>
      [
        row.leadCode,
        row.clientName,
        row.assignedUser,
        row.status,
        row.amount,
        row.service,
      ].some((value) => String(value ?? "").toLowerCase().includes(normalizedQuery)),
    );
  }, [query, rows]);

  return (
    <DashboardCard
      title="Recent Records"
      description="Latest lead entries from the current workspace pipeline."
      action={
        <label className="flex h-10 w-full min-w-0 items-center gap-2 rounded-xl border border-[color:var(--border)] bg-white px-3 text-sm shadow-sm sm:w-72 dark:bg-white/5">
          <Search size={16} className="text-blue-600" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search records"
            className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-[color:var(--text-muted)]"
          />
        </label>
      }
      className="shadow-sm shadow-blue-950/5"
    >
      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Leads Found"
          description="Recent lead records will appear here once new leads are added."
        />
      ) : (
        <div className="min-w-0 overflow-hidden rounded-xl border border-[color:var(--border)] bg-white shadow-sm dark:bg-white/5">
          <div className="max-h-[420px] overflow-auto">
            <table className="min-w-[780px] w-full text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-[color:var(--border)] bg-blue-50/95 text-xs font-semibold uppercase tracking-[0.14em] text-soft backdrop-blur dark:bg-blue-500/10">
                <tr>
                  <th className="px-4 py-3">Lead ID</th>
                  <th className="px-4 py-3">Client Name</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Revenue</th>
                  <th className="px-4 py-3">Service</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    className="transition hover:bg-blue-50/60 dark:hover:bg-blue-500/10"
                  >
                    <td className="px-4 py-3 font-semibold text-blue-700 dark:text-blue-200">
                      {row.leadCode}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 dark:text-white">{row.clientName}</p>
                      <p className="mt-1 text-xs text-soft">{row.email || row.mobile || "-"}</p>
                    </td>
                    <td className="px-4 py-3 text-soft">{row.assignedUser || "-"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
                          statusStyles[row.status] ??
                            "bg-slate-50 text-slate-700 ring-slate-100 dark:bg-white/10 dark:text-white dark:ring-white/10",
                        )}
                      >
                        {formatStatus(String(row.status))}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold">{row.amount || "-"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                        {row.service || "-"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRows.length === 0 ? (
              <div className="border-t border-[color:var(--border)] px-4 py-8 text-center text-sm text-soft">
                No records match your search.
              </div>
            ) : null}
          </div>
        </div>
      )}
    </DashboardCard>
  );
}
