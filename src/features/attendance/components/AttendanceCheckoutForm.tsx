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
      <div className="flex max-w-3xl flex-col items-center justify-center rounded-[32px] border border-emerald-100 bg-emerald-50/50 p-16 shadow-lg shadow-emerald-500/10 backdrop-blur-md dark:border-emerald-500/20 dark:bg-emerald-500/10 animate-in fade-in zoom-in duration-500">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-500/30 dark:bg-emerald-500 dark:text-white">
          <CheckCircle2 size={48} className="animate-in zoom-in delay-150 duration-500" />
        </div>
        <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Checked Out Successfully</h2>
        <p className="mt-3 max-w-md text-center text-slate-600 dark:text-slate-400">
          Your daily work summary has been recorded. Have a great rest of your day!
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl overflow-hidden rounded-3xl border border-white/40 bg-white/60 p-1.5 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#0f1623]/80">
      <div className="relative overflow-hidden rounded-[20px] bg-white dark:bg-[#151e2e]">
        
        {/* Header Gradient Banner */}
        <div className="relative bg-linear-to-br from-orange-500 via-amber-500 to-yellow-500 px-8 py-10">
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/20 blur-3xl"></div>
          <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-black/10 blur-2xl"></div>
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 shadow-inner backdrop-blur-md">
                <Clock3 size={28} className="text-white animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-orange-100">End of Day</p>
                <h2 className="text-3xl font-black tracking-tight text-white drop-shadow-md">Check Out</h2>
              </div>
            </div>
            
            {/* Digital Clock Display for Desktop */}
            <div className="hidden flex-col items-end sm:flex">
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-orange-100/80">Server Time</p>
              <div className="rounded-xl bg-black/20 px-4 py-2 font-mono text-xl font-bold tracking-tight text-white backdrop-blur-sm">
                {displayTime}
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Form Content */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="grid gap-8">
            
            {/* Mobile Clock Display (visible only on small screens) */}
            <div className="mb-2 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center sm:hidden dark:border-white/5 dark:bg-white/5">
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">Server Time</p>
              <p className="font-mono text-2xl font-bold text-slate-800 dark:text-slate-200">{displayTime}</p>
            </div>

            <div className="group relative grid gap-3">
              <label className="flex items-center justify-between text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                <span>Daily Work Summary <span className="text-rose-500">*</span></span>
                <span className={`text-xs ${isValid ? "text-emerald-500" : "text-slate-400"}`}>
                  {summaryLength} / min 10
                </span>
              </label>
              
              <div className="relative">
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={6}
                  placeholder="What did you accomplish today? Be descriptive..."
                  className="peer w-full resize-none rounded-2xl border-2 border-slate-100 bg-slate-50/50 p-5 text-sm leading-relaxed text-slate-800 placeholder-slate-400 transition-all duration-300 focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 dark:border-white/5 dark:bg-white/5 dark:text-white dark:placeholder-white/30 dark:focus:border-orange-500 dark:focus:bg-[#1a2333]"
                />
                
                {/* Decorative corner accents on focus */}
                <div className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-bl-xl rounded-tr-2xl border-r-2 border-t-2 border-orange-500 opacity-0 transition-opacity duration-300 peer-focus:opacity-100"></div>
                <div className="absolute -bottom-0.5 -left-0.5 h-4 w-4 rounded-bl-2xl rounded-tr-xl border-b-2 border-l-2 border-orange-500 opacity-0 transition-opacity duration-300 peer-focus:opacity-100"></div>
              </div>
            </div>

            {message && (
              <div
                className={`animate-in fade-in slide-in-from-bottom-2 rounded-2xl p-4 text-sm font-bold ${
                  message.type === "error"
                    ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                    : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting || !isValid}
                className="group relative flex items-center gap-2 overflow-hidden rounded-2xl bg-slate-900 px-8 py-4 text-sm font-bold text-white transition-all duration-300 hover:scale-[1.02] hover:bg-slate-800 hover:shadow-xl hover:shadow-orange-500/20 active:scale-95 disabled:pointer-events-none disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                <div className="absolute inset-0 bg-linear-to-r from-orange-500 to-amber-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                <span className="relative z-10">{submitting ? "Processing..." : "Complete Check Out"}</span>
                {!submitting && (
                  <svg className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
