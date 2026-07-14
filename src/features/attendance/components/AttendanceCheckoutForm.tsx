"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { readJsonResponse } from "@/utils/fetch";
import { Clock3, CheckCircle2 } from "lucide-react";

type Props = {
  serverTimeStr: string;
};

export function AttendanceCheckoutForm({ serverTimeStr }: Props) {
  const [summary, setSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  const serverTime = new Date(serverTimeStr);
  const displayTime = format(serverTime, "hh:mm a");

  const summaryLength = summary.trim().length;
  const isValid = summaryLength >= 10;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!isValid) {
      setMessage({ text: "Daily summary must be at least 10 characters.", type: "error" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/attendance/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutTime: serverTimeStr,
          dailySummary: summary.trim(),
        }),
      });

      const data = await readJsonResponse<{ message?: string }>(res);

      if (!res.ok) {
        setMessage({ text: data.message || "Failed to check out.", type: "error" });
        return;
      }

      setIsSuccess(true);
      setMessage({ text: "Checked out successfully.", type: "success" });
      router.refresh();
    } catch (err) {
      console.error(err);
      setMessage({ text: "Network error. Please try again.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="flex max-w-3xl flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-12 shadow-sm dark:border-white/10 dark:bg-[#0f1623]">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Checked Out Today</h2>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Your daily work summary has been saved and your attendance is marked as checked out.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0f1623] overflow-hidden">
      <div className="bg-linear-to-r from-orange-500 to-amber-400 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20">
            <Clock3 size={22} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-100">End of Day</p>
            <h2 className="text-xl font-bold text-white">Check Out</h2>
          </div>
        </div>
      </div>
      
      <div className="p-6 grid gap-6">
        <div className="grid gap-2">
          <label className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Check-Out Time (Server Time)
          </label>
          <input
            type="text"
            value={displayTime}
            readOnly
            className="w-full rounded-xl border border-slate-200 bg-slate-100 p-4 text-sm font-bold text-slate-600 cursor-not-allowed focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
          />
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6">
          <div className="grid gap-2">
            <label className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Daily Work Summary <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={6}
              placeholder="Type your daily work summary here..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/30"
            />
            <p className={`text-xs ${isValid ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>
              {summaryLength} characters (min 10 required)
            </p>
          </div>

          {message && (
            <div
              className={`rounded-xl p-4 text-sm font-medium ${
                message.type === "error"
                  ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                  : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !isValid}
              className="rounded-xl bg-linear-to-r from-orange-500 to-amber-400 px-6 py-3 text-sm font-bold text-white shadow-md shadow-orange-500/25 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? "Processing..." : "Complete Check Out"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
