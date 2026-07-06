"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";

export function DailySummaryView({ canViewAll }: { canViewAll: boolean }) {
  const [summaries, setSummaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchSummaries();
  }, [search]);

  async function fetchSummaries() {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.set("search", search);
      const res = await fetch(`/api/attendance/daily-summary?${q.toString()}`);
      const data = await res.json();
      if (data.summaries) {
        setSummaries(data.summaries);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0f1623]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Daily Summaries</h2>
        {canViewAll && (
          <input
            type="text"
            placeholder="Search by name or summary..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 dark:border-white/10 dark:text-slate-500">
              <th className="pb-3 pr-4 font-semibold">Date</th>
              <th className="pb-3 pr-4 font-semibold">Employee</th>
              <th className="pb-3 pr-4 font-semibold">Department / Office</th>
              <th className="pb-3 pr-4 font-semibold">Check-In / Out</th>
              <th className="pb-3 pr-4 font-semibold">Status</th>
              <th className="pb-3 font-semibold">Summary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {loading ? (
              <tr><td colSpan={6} className="py-4 text-center">Loading...</td></tr>
            ) : summaries.length === 0 ? (
              <tr><td colSpan={6} className="py-4 text-center">No summaries found.</td></tr>
            ) : (
              summaries.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-white/5">
                  <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                    {format(new Date(s.summaryDate), "dd MMM yyyy")}
                  </td>
                  <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">
                    {s.user.name}
                  </td>
                  <td className="py-3 pr-4">
                    {s.user.departmentRef?.name ?? "-"} <br/>
                    <span className="text-xs text-slate-400">{s.user.officeLocationRef?.officeName ?? "-"}</span>
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    In: {s.attendance.checkinTime ? format(new Date(s.attendance.checkinTime), "hh:mm a") : "-"}<br/>
                    Out: {s.attendance.checkoutTime ? format(new Date(s.attendance.checkoutTime), "hh:mm a") : "-"}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                      {s.attendance.status}
                    </span>
                  </td>
                  <td className="py-3">
                    <p className="whitespace-pre-wrap max-w-xl text-xs">{s.summary}</p>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
