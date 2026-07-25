"use client";

import { useEffect, useRef, useState } from "react";
import type { AttendanceRecord } from "@/features/attendance/types/attendance.types";
import { readJsonResponse } from "@/utils/fetch";

type Props = {
  userId: string;
};

type ModalState = "idle" | "checkin";

export function AttendanceGuard({ userId }: Props) {
  const [modal, setModal] = useState<ModalState>("idle");
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Check-in form state
  const [checkinTime, setCheckinTime] = useState(() => toTimeInputValue(new Date()));
  const [checkinRemarks, setCheckinRemarks] = useState("");

  const [rejectReason, setRejectReason] = useState("");
  const [rejectTargetId, setRejectTargetId] = useState("");
  const [rejectModal, setRejectModal] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);

  // ── fetch today's record on mount ──
  useEffect(() => {
    fetchToday();
  }, [userId]);

  async function fetchToday() {
    try {
      const res = await fetch("/api/attendance/today");
      const data = await readJsonResponse<{ ready?: boolean; record?: AttendanceRecord | null; setting?: { expectedCheckinTime: string, expectedCheckoutTime: string } | null; message?: string }>(res);
      if (!res.ok) {
        throw new Error(data.message ?? "Unable to load today's attendance.");
      }
      if (data.ready === false) {
        // Tables not migrated yet — don't block dashboard access
        setModal("idle");
        return;
      }
      setTodayRecord(data.record ?? null);
      
      const currentTime = toTimeInputValue(new Date());
      const expectedCheckinTime = data.setting?.expectedCheckinTime || "09:00";
      const expectedCheckoutTime = data.setting?.expectedCheckoutTime || "18:00";

      if (!data.record) {
        if (currentTime >= expectedCheckinTime) {
          setCheckinTime(toTimeInputValue(new Date()));
          setModal("checkin");
        } else {
          setModal("idle");
        }
      } else {
        setModal("idle");
      }
    } catch (err) {
      if (err instanceof Error && (err.message.includes("not set up") || err.message.includes("migrations"))) {
        setError(err.message);
        setModal("checkin");
      }
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
      const data = await readJsonResponse<{ record?: AttendanceRecord; message?: string }>(res);
      if (!res.ok) {
        setError(data.message ?? "Check-in failed.");
        return;
      }
      setTodayRecord(data.record ?? null);
      setModal("idle");
    } catch (error) {
      console.error("[attendance] checkin error:", error);
      setError(error instanceof Error ? error.message : "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }


  if (loading) return null;
  if (modal === "idle") return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-9999 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4"
      style={{ pointerEvents: "all" }}
    >
      {modal === "checkin" && (
        <div className="w-full max-w-md rounded-3xl border border-blue-100 bg-white shadow-2xl dark:border-blue-500/20 dark:bg-[#0f1623] overflow-hidden">
          {/* Header */}
          <div className="bg-linear-to-r from-blue-600 to-sky-500 px-6 py-5">
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
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-blue-600 to-sky-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:opacity-90 disabled:opacity-60"
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
