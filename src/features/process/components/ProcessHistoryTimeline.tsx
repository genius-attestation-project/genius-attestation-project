"use client";

import { useEffect, useState } from "react";
import { FormDrawer } from "@/components/ui/FormDrawer";

type HistoryItem = {
  id: string;
  action: string;
  fromModule: string;
  toModule: string;
  remarks: string | null;
  userName: string | null;
  createdAt: string;
};

type ProcessHistoryTimelineProps = {
  open: boolean;
  onClose: () => void;
  trackingNumber: string | null;
};

export function ProcessHistoryTimeline({ open, onClose, trackingNumber }: ProcessHistoryTimelineProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [docDetails, setDocDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && trackingNumber) {
      loadHistory();
    }
  }, [open, trackingNumber]);

  async function loadHistory() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/process/history/${trackingNumber}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Failed to load history");
      
      const resData = payload.data || payload;
      if (Array.isArray(resData)) {
        setHistory(resData);
        setDocDetails(null);
      } else {
        setHistory(resData.history || resData.data || []);
        setDocDetails(resData.document || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading history");
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Live Document Movement & Timeline"
      description={`Comprehensive tracking history and document details for ${trackingNumber}`}
      placement="center"
    >
      <div className="min-h-[200px] space-y-6 pt-2">
        {docDetails && (
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 text-xs dark:border-white/10 dark:bg-white/5 space-y-3 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5 dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                  {docDetails.trackingNumber}
                </span>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                  {docDetails.mainProcess}
                </span>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                Status: {docDetails.currentStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
              <div>
                <span className="text-slate-400 block font-medium">Customer</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{docDetails.customerName}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Mobile</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{docDetails.mobile}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Document Type</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{docDetails.documentType}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Sub Package</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{docDetails.subPackage}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Registered Office</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{docDetails.registeredOffice}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Current Office</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{docDetails.currentOffice}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Registered Date</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{docDetails.registeredDate}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Total Amount</span>
                <span className="font-bold text-slate-900 dark:text-white">₹{docDetails.totalAmount}</span>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-center text-sm text-soft py-10">Loading history...</p>
        ) : error ? (
          <p className="text-center text-sm text-rose-600 py-10">{error}</p>
        ) : history.length === 0 ? (
          <p className="text-center text-sm text-soft py-10">No history found.</p>
        ) : (
          <div className="space-y-6">
            {history.map((item, index) => (
              <div key={item.id} className="relative pl-6">
                {index !== history.length - 1 && (
                  <div className="absolute left-[11px] top-6 bottom-[-24px] w-[2px] bg-slate-200" />
                )}
                <div className="absolute left-0 top-1.5 h-6 w-6 rounded-full border-4 border-white bg-blue-500 shadow-sm" />
                
                <div>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-bold text-slate-900">{item.action}</span>
                    <span className="text-xs text-soft">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm mt-1 text-slate-600">
                    {item.fromModule} → {item.toModule}
                  </p>
                  {item.userName && (
                    <p className="text-xs font-medium text-slate-500 mt-1">
                      By: {item.userName}
                    </p>
                  )}
                  {item.remarks && (
                    <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700 italic border border-slate-100">
                      "{item.remarks}"
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </FormDrawer>
  );
}
