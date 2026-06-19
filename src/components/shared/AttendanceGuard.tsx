"use client";

import { useEffect, useRef, useState } from "react";
import type { AttendanceRecord } from "@/features/attendance/types/attendance.types";

type Props = {
  userId: string;
};

type ModalState = "idle" | "checkin" | "checkout";

export function AttendanceGuard({ userId }: Props) {
  const [modal, setModal] = useState<ModalState>("idle");
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Check-in form state
  const [checkinTime, setCheckinTime] = useState(() => toTimeInputValue(new Date()));
  const [checkinRemarks, setCheckinRemarks] = useState("");

  // Check-out form state
  const [checkoutTime, setCheckoutTime] = useState(() => toTimeInputValue(new Date()));
  const [dailySummary, setDailySummary] = useState("");

  const [rejectReason, setRejectReason] = useState("");
  const [rejectTargetId, setRejectTargetId] = useState("");
  const [rejectModal, setRejectModal] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);

  // ── fetch today's record on mount ──
  useEffect(() => {
    fetchToday();
  }, [userId]);

  // ── intercept sign-out clicks ──
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const btn = (e.target as HTMLElement).closest("button, [type=submit]");
      if (!btn) return;
      const text = btn.textContent?.trim().toLowerCase() ?? "";
      if (text.includes("sign out") || text.includes("logout") || text.includes("log out")) {
        if (todayRecord && !todayRecord.checkoutTime) {
          e.preventDefault();
          e.stopImmediatePropagation();
          setCheckoutTime(toTimeInputValue(new Date()));
          setDailySummary("");
          setError("");
          setModal("checkout");
        }
      }
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [todayRecord]);

  async function fetchToday() {
    try {
      const res = await fetch("/api/attendance/today");
      const data = await res.json();
      if (data.ready === false) {
        // Tables not migrated yet — don't block dashboard access
        setModal("idle");
        return;
      }
      setTodayRecord(data.record);
      if (!data.record) {
        setCheckinTime(toTimeInputValue(new Date()));
        setModal("checkin");
      }
    } catch {
      // silently fail — don't block the app if attendance API is unreachable
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckin() {
    setError("");
    setSubmitting(true);
    try {
      const checkinDateTime = buildDateTime(checkinTime);
      const res = await fetch("/api/attendance/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkinTime: checkinDateTime,
          checkinRemarks: checkinRemarks || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Check-in failed.");
        return;
      }
      setTodayRecord(data.record);
      setModal("idle");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckout() {
    setError("");
    if (!dailySummary.trim() || dailySummary.trim().length < 10) {
      setError("Daily summary must be at least 10 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const checkoutDateTime = buildDateTime(checkoutTime);
      const res = await fetch("/api/attendance/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutTime: checkoutDateTime,
          dailySummary: dailySummary.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Check-out failed.");
        return;
      }
      setTodayRecord(data.record);
      setModal("idle");

      // proceed with sign out
      const forms = document.querySelectorAll("form");
      for (const form of forms) {
        const btn = form.querySelector("button");
        if (btn?.textContent?.toLowerCase().includes("sign out")) {
          form.requestSubmit();
          return;
        }
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;
  if (modal === "idle") return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4"
      style={{ pointerEvents: "all" }}
    >
      {modal === "checkin" && (
        <div className="w-full max-w-md rounded-3xl border border-blue-100 bg-white shadow-2xl dark:border-blue-500/20 dark:bg-[#0f1623] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-sky-500 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20">
                <svg width="22" height="22" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-100">Attendance</p>
                <h2 className="text-xl font-bold text-white">Good Morning! Check In</h2>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 grid gap-5">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Please confirm your check-in to start today's session. This is mandatory before you can access the dashboard.
            </p>

            {/* Check-in time */}
            <div className="grid gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Check-In Time
              </label>
              <input
                type="time"
                value={checkinTime}
                onChange={(e) => setCheckinTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>

            {/* Remarks */}
            <div className="grid gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Remarks <span className="normal-case font-normal">(optional)</span>
              </label>
              <textarea
                value={checkinRemarks}
                onChange={(e) => setCheckinRemarks(e.target.value)}
                placeholder="E.g., Working from branch office today..."
                rows={2}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/30"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleCheckin}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Checking In…
                </>
              ) : (
                <>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                  Check In Now
                </>
              )}
            </button>

            <p className="text-center text-xs text-slate-400 dark:text-white/30">
              You cannot access the dashboard until you check in.
            </p>
          </div>
        </div>
      )}

      {modal === "checkout" && (
        <div className="w-full max-w-md rounded-3xl border border-orange-100 bg-white shadow-2xl dark:border-orange-500/20 dark:bg-[#0f1623] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-amber-400 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20">
                <svg width="22" height="22" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-100">End of Day</p>
                <h2 className="text-xl font-bold text-white">Check Out Before Leaving</h2>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 grid gap-5">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Please complete your daily work summary before signing out. This is required to submit your attendance for approval.
            </p>

            {/* Check-out time */}
            <div className="grid gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Check-Out Time
              </label>
              <input
                type="time"
                value={checkoutTime}
                onChange={(e) => setCheckoutTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>

            {/* Daily summary */}
            <div className="grid gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Daily Work Summary <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={dailySummary}
                onChange={(e) => setDailySummary(e.target.value)}
                placeholder={"Created 10 leads.\nCompleted 4 followups.\nProcessed 6 registrations.\nUpdated customer payments."}
                rows={5}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/30"
              />
              <p className="text-xs text-slate-400 dark:text-white/30">
                {dailySummary.length} characters (min. 10 required)
              </p>
            </div>

            {error && (
              <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleCheckout}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Checking Out…
                </>
              ) : (
                <>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                  Submit & Sign Out
                </>
              )}
            </button>

            <p className="text-center text-xs text-slate-400 dark:text-white/30">
              You must submit your work summary to sign out.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── utils ────────────────────────────────────────────────────────────────────

function toTimeInputValue(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function buildDateTime(timeValue: string): string {
  const [h, m] = timeValue.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}
