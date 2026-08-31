"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";

export function DailySummaryView({ canViewAll }: { canViewAll: boolean }) {
  const [summaries, setSummaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSummary, setSelectedSummary] = useState<any>(null);

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
    <>
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
                <th className="pb-3 font-semibold w-[30%]">Daily Work Summary</th>
                <th className="pb-3 pl-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr><td colSpan={7} className="py-4 text-center">Loading...</td></tr>
              ) : summaries.length === 0 ? (
                <tr><td colSpan={7} className="py-4 text-center">No summaries found.</td></tr>
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
                    <td className="py-3 max-w-[250px]">
                      <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400" title={s.summary}>
                        {s.summary}
                      </p>
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <button
                        onClick={() => setSelectedSummary(s)}
                        className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl dark:bg-[#0f1623] dark:ring-1 dark:ring-white/10">
            <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-white/10">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Detailed Summary
              </h3>
              <button
                onClick={() => setSelectedSummary(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-300"
              >
                ✕
              </button>
            </div>
            
            <div className="overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Employee Name</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{selectedSummary.user.name}</p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Employee ID</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{selectedSummary.user.id.slice(-8).toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Department</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{selectedSummary.user.departmentRef?.name ?? "-"}</p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Office Location</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{selectedSummary.user.officeLocationRef?.officeName ?? "-"}</p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Date</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{format(new Date(selectedSummary.summaryDate), "dd MMM yyyy")}</p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Attendance Status</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{selectedSummary.attendance.status}</p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Check-in Time</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{selectedSummary.attendance.checkinTime ? format(new Date(selectedSummary.attendance.checkinTime), "hh:mm a") : "-"}</p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Check-out Time</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{selectedSummary.attendance.checkoutTime ? format(new Date(selectedSummary.attendance.checkoutTime), "hh:mm a") : "-"}</p>
                </div>
                {selectedSummary.attendance.approvalStatus && (
                  <>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">Approval Status</p>
                      <p className="font-semibold text-slate-900 dark:text-white">{selectedSummary.attendance.approvalStatus}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">Approved By</p>
                      <p className="font-semibold text-slate-900 dark:text-white">{selectedSummary.attendance.approvedBy ?? "-"}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">Approved Date</p>
                      <p className="font-semibold text-slate-900 dark:text-white">{selectedSummary.attendance.approvedAt ? format(new Date(selectedSummary.attendance.approvedAt), "dd MMM yyyy, hh:mm a") : "-"}</p>
                    </div>
                  </>
                )}
              </div>

              <div className="mb-6">
                <h4 className="mb-2 text-sm font-bold text-slate-900 dark:text-white">Daily Work Summary</h4>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 whitespace-pre-wrap">
                  {selectedSummary.summary || "No daily work summary provided."}
                </div>
              </div>
            </div>
            
            <div className="border-t border-slate-100 p-6 text-right dark:border-white/10">
              <button
                onClick={() => setSelectedSummary(null)}
                className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
