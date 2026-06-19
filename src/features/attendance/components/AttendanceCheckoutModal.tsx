"use client";

import { useEffect, useState } from "react";

const EXAMPLE_SUMMARY =
  "Created 10 leads.\nCompleted 4 followups.\nProcessed 6 registrations.\nUpdated customer payments.";

type Props = {
  open: boolean;
  checkoutTime: string;
  onCheckoutTimeChange: (value: string) => void;
  onSubmit: (summary: string) => void;
  submitting: boolean;
  error: string;
  attendanceId?: string | null;
};

export function AttendanceCheckoutModal({
  open,
  checkoutTime,
  onCheckoutTimeChange,
  onSubmit,
  submitting,
  error,
  attendanceId,
}: Props) {
  const [summary, setSummary] = useState("");

  useEffect(() => {
    if (open) {
      setSummary("");
    }
  }, [open]);

  if (!open) return null;

  const summaryLength = summary.length;
  const summaryValid = summary.trim().length >= 10;

  function handleSubmit() {
    console.log("Submit clicked");
    console.log("Summary:", summary);
    console.log("Attendance ID:", attendanceId ?? null);
    onSubmit(summary);
  }

  return (
    <div
      data-attendance-modal="checkout"
      className="w-full max-w-md rounded-3xl border border-orange-100 bg-white shadow-2xl dark:border-orange-500/20 dark:bg-[#0f1623] overflow-hidden"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
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

      <div className="p-6 grid gap-5">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Please complete your daily work summary before signing out. This is required to submit your attendance for approval.
        </p>

        <div className="grid gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Check-Out Time
          </label>
          <input
            type="time"
            value={checkoutTime}
            onChange={(e) => onCheckoutTimeChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="attendance-daily-summary"
              className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"
            >
              Daily Work Summary <span className="text-rose-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setSummary(EXAMPLE_SUMMARY)}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-300 dark:hover:text-orange-200"
            >
              Use example template
            </button>
          </div>
          <textarea
            id="attendance-daily-summary"
            name="dailySummary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            onInput={(e) => setSummary(e.currentTarget.value)}
            placeholder="Type your daily work summary here..."
            rows={5}
            autoComplete="off"
            spellCheck
            className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/30"
          />
          <p
            className={`text-xs ${summaryValid ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-white/30"}`}
          >
            {summaryLength} characters (min. 10 required)
          </p>
        </div>

        {error && (
          <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
            {error}
          </p>
        )}

        <button
          type="button"
          data-attendance-action="checkout-submit"
          onClick={handleSubmit}
          disabled={submitting || !summaryValid}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Submitting…
            </>
          ) : (
            <>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
              Submit &amp; Sign Out
            </>
          )}
        </button>

        <p className="text-center text-xs text-slate-400 dark:text-white/30">
          You must submit your work summary to sign out.
        </p>
      </div>
    </div>
  );
}
