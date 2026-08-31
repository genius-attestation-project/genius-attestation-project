"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type AuditLog = {
  id: string;
  requestType: string;
  action: string;
  actorId: string;
  actorName: string;
  remarks: string | null;
  createdAt: string;
};

export function ApprovalTimeline({ leadId }: { leadId: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch(`/api/workflow-approvals/audit?leadId=${leadId}`);
        const data = await res.json();
        if (data.items) {
          setLogs(data.items);
        }
      } catch (e) {
        console.error("Failed to fetch audit logs", e);
      } finally {
        setLoading(false);
      }
    }
    void fetchLogs();
  }, [leadId]);

  if (loading) {
    return (
      <div className="flex h-20 items-center justify-center rounded-2xl border border-(--border) bg-slate-50 dark:bg-white/5">
        <Loader2 className="animate-spin text-soft" size={20} />
      </div>
    );
  }

  if (logs.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-900">Approval Timeline</h3>
      <div className="relative border-l border-blue-200 ml-3 pl-4">
        {logs.map((log) => (
          <div key={log.id} className="mb-6 last:mb-0 relative">
            <div className="absolute left-[-21px] top-1 h-2.5 w-2.5 rounded-full bg-blue-500 ring-4 ring-white" />
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-soft">
                {new Intl.DateTimeFormat("en-IN", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(log.createdAt))}
              </span>
              <p className="text-sm text-slate-800">
                <span className="font-bold">{log.actorName}</span> performed <span className="font-semibold text-blue-700">{log.action}</span> on <span className="font-semibold">{log.requestType.replace("_", " ")}</span>
              </p>
              {log.remarks && (
                <p className="mt-1 text-xs text-slate-600 bg-slate-100 p-2 rounded-xl italic">"{log.remarks}"</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
