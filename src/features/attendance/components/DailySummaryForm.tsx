"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";

export function DailySummaryForm() {
  const [summary, setSummary] = useState("");
  const [recordId, setRecordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchMySummary();
  }, []);

  async function fetchMySummary() {
    setLoading(true);
    try {
      const res = await fetch("/api/attendance/daily-summary/me");
      const data = await res.json();
      if (res.ok && data.record) {
        setRecordId(data.record.id);
        setSummary(data.record.summary);
      }
    } catch (err) {
      console.error("Failed to load daily summary", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    const trimmed = summary.trim();
    if (trimmed.length < 20 || trimmed.length > 5000) {
      setMessage({ text: "Summary must be between 20 and 5000 characters.", type: "error" });
      return;
    }

    setSubmitting(true);
    try {
      let res;
      if (recordId) {
        res = await fetch(`/api/attendance/daily-summary/${recordId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ summary: trimmed }),
        });
      } else {
        res = await fetch("/api/attendance/daily-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ summary: trimmed }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.message || "Failed to save summary.", type: "error" });
        return;
      }

      setRecordId(data.record.id);
      setMessage({ text: "Daily summary saved successfully.", type: "success" });
    } catch (err) {
      console.error(err);
      setMessage({ text: "Network error. Please try again.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-slate-500">Loading today's summary...</div>;
  }

  return (
    <div className="max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0f1623]">
      <div className="mb-6 border-b border-slate-100 pb-4 dark:border-white/10">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Today's Summary</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {format(new Date(), "EEEE, MMMM do yyyy")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6">
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Work Summary <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={8}
            placeholder="Describe your work for today..."
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/30"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {summary.trim().length} / 5000 characters (min 20)
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
            disabled={submitting}
            className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50"
          >
            {submitting ? "Saving..." : recordId ? "Update Summary" : "Submit Summary"}
          </button>
        </div>
      </form>
    </div>
  );
}
