"use client";

import { useCallback, useEffect, useState } from "react";
import type { AttendanceRecord } from "@/features/attendance/types/attendance.types";

const STATUS_COLORS: Record<string, string> = {
  Present: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  Late: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  Absent: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  HalfDay: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
};

const APPROVAL_COLORS: Record<string, string> = {
  Pending: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  Approved: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  Rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

export function AttendanceRecordsTable() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 15;

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance?page=${page}&limit=${limit}`);
      const data = await res.json();
      setRecords(data.records ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="grid gap-4">
      {/* Table wrapper */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white dark:border-white/8 dark:bg-white/5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/8">
                {["Date", "Check-In", "Check-Out", "Hours", "Status", "Approval"].map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-white/45"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-4">
                          <div className="h-4 animate-pulse rounded-lg bg-slate-100 dark:bg-white/5" />
                        </td>
                      ))}
                    </tr>
                  ))
                : records.map((r) => (
                    <tr
                      key={r.id}
                      className="transition hover:bg-slate-50 dark:hover:bg-white/3"
                    >
                      <td className="px-4 py-3.5 font-semibold text-slate-800 dark:text-white">
                        {r.attendanceDate}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-white/70">
                        {r.checkinTime ?? "—"}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-white/70">
                        {r.checkoutTime ?? "—"}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-700 dark:text-white/80">
                        {r.workingHours ? `${r.workingHours} hrs` : "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_COLORS[r.status] ?? ""}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${APPROVAL_COLORS[r.approvalStatus] ?? ""}`}>
                          {r.approvalStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
              {!loading && records.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400 dark:text-white/30">
                    No attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-white/45">
            Page {page} of {totalPages} · {total} records
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
