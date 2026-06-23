"use client";

import { useCallback, useEffect, useState } from "react";
import type { AttendanceRecord } from "@/features/attendance/types/attendance.types";
import { readJsonResponse } from "@/utils/fetch";

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

type FilterType = "all" | "Pending" | "Approved" | "Rejected";

export function AttendanceApprovalTable() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<AttendanceRecord | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [detailModal, setDetailModal] = useState<AttendanceRecord | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const url =
        filter === "all"
          ? "/api/attendance?limit=100"
          : `/api/attendance?limit=100`;
      const res = await fetch(url);
      const data = await readJsonResponse<{ records?: AttendanceRecord[]; record?: AttendanceRecord; message?: string }>(res);
      let allRecords: AttendanceRecord[] = data.records ?? [];
      if (filter !== "all") {
        allRecords = allRecords.filter((r) => r.approvalStatus === filter);
      }
      setRecords(allRecords);
    } catch (error) {
      console.error("Failed to load attendance approvals", error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleApprove(record: AttendanceRecord) {
    setActionLoading(record.id);
    try {
      const res = await fetch(`/api/attendance/${record.id}/approve`, { method: "POST" });
      const data = await readJsonResponse<{ record?: AttendanceRecord; message?: string }>(res);
      if (!res.ok) {
        showToast("error", data.message ?? "Approval failed.");
        return;
      }
      setRecords((prev) => prev.map((r) => (r.id === record.id ? data.record : r)));
      showToast("success", `Approved attendance for ${record.userName}.`);
    } catch (error) {
      console.error("Failed to approve attendance", error);
      showToast("error", error instanceof Error ? error.message : "Network error.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject() {
    if (!rejectModal) return;
    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      setRejectError("Please enter a reason (min. 5 characters).");
      return;
    }
    setRejectError("");
    setActionLoading(rejectModal.id);
    try {
      const res = await fetch(`/api/attendance/${rejectModal.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason: rejectReason.trim() }),
      });
      const data = await readJsonResponse<{ record?: AttendanceRecord; message?: string }>(res);
      if (!res.ok) {
        setRejectError(data.message ?? "Rejection failed.");
        return;
      }
      setRecords((prev) => prev.map((r) => (r.id === rejectModal.id ? data.record : r)));
      showToast("success", `Rejected attendance for ${rejectModal.userName}.`);
      setRejectModal(null);
      setRejectReason("");
    } catch (error) {
      console.error("Failed to reject attendance", error);
      setRejectError(error instanceof Error ? error.message : "Network error.");
    } finally {
      setActionLoading(null);
    }
  }

  const filterTabs: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "Pending", label: "Pending" },
    { key: "Approved", label: "Approved" },
    { key: "Rejected", label: "Rejected" },
  ];

  return (
    <div className="grid gap-4">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-6 top-6 z-50 rounded-2xl px-5 py-3.5 text-sm font-semibold text-white shadow-xl transition-all ${
            toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              filter === tab.key
                ? "bg-blue-600 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white/70"
            }`}
          >
            {tab.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          type="button"
          onClick={fetchRecords}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white/70"
        >
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white dark:border-white/8 dark:bg-white/5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/8">
                {["User", "Office", "Date", "Check-In", "Check-Out", "Hours", "Status", "Approval", "Actions"].map((col) => (
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
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
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
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-white">{r.userName}</p>
                          <p className="text-xs text-slate-400 dark:text-white/40">{r.userEmail}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-white/70">{r.officeLocation}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-700 dark:text-white/80">{r.attendanceDate}</td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-white/70">{r.checkinTime ?? "—"}</td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-white/70">{r.checkoutTime ?? "—"}</td>
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
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          {/* View detail */}
                          <button
                            type="button"
                            onClick={() => setDetailModal(r)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white/70"
                          >
                            View
                          </button>
                          {r.approvalStatus === "Pending" && (
                            <>
                              <button
                                type="button"
                                disabled={actionLoading === r.id}
                                onClick={() => handleApprove(r)}
                                className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                              >
                                {actionLoading === r.id ? "…" : "Approve"}
                              </button>
                              <button
                                type="button"
                                disabled={actionLoading === r.id}
                                onClick={() => { setRejectModal(r); setRejectReason(""); setRejectError(""); }}
                                className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              {!loading && records.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-400 dark:text-white/30">
                    No attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-rose-100 bg-white shadow-2xl dark:border-rose-500/20 dark:bg-[#0f1623] overflow-hidden">
            <div className="bg-gradient-to-r from-rose-600 to-pink-500 px-6 py-5">
              <h2 className="text-lg font-bold text-white">Reject Attendance</h2>
              <p className="text-sm text-rose-100">For {rejectModal.userName} · {rejectModal.attendanceDate}</p>
            </div>
            <div className="p-6 grid gap-4">
              <div className="grid gap-1.5">
                <label className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Rejection Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter the reason for rejection..."
                  rows={4}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </div>
              {rejectError && (
                <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                  {rejectError}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRejectModal(null)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={actionLoading === rejectModal.id}
                  className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
                >
                  {actionLoading === rejectModal.id ? "Rejecting…" : "Confirm Reject"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-blue-100 bg-white shadow-2xl dark:border-blue-500/20 dark:bg-[#0f1623] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-sky-500 px-6 py-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Attendance Detail</h2>
                <p className="text-sm text-blue-100">{detailModal.userName} · {detailModal.attendanceDate}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailModal(null)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-white transition hover:bg-white/30"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="p-6 grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Check-In", value: detailModal.checkinTime ?? "—" },
                  { label: "Check-Out", value: detailModal.checkoutTime ?? "—" },
                  { label: "Working Hours", value: detailModal.workingHours ? `${detailModal.workingHours} hrs` : "—" },
                  { label: "Status", value: detailModal.status },
                  { label: "Approval", value: detailModal.approvalStatus },
                  { label: "Office", value: detailModal.officeLocation },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-white/40">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
              {detailModal.checkinRemarks && (
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-white/40">Check-In Remarks</p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-white/80">{detailModal.checkinRemarks}</p>
                </div>
              )}
              {detailModal.dailySummary && (
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-white/40">Daily Work Summary</p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-white/80 whitespace-pre-wrap">{detailModal.dailySummary}</p>
                </div>
              )}
              {detailModal.rejectionReason && (
                <div className="rounded-xl bg-rose-50 p-3 dark:bg-rose-500/10">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-rose-500">Rejection Reason</p>
                  <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">{detailModal.rejectionReason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
