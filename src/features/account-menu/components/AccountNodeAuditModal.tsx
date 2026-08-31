"use client";

import React, { useEffect, useState } from "react";
import type { AccountNode, AccountMenuAuditLogItem } from "../types/account-menu.types";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { History, User, Clock, CheckCircle2 } from "lucide-react";

interface AccountNodeAuditModalProps {
  open: boolean;
  onClose: () => void;
  node: AccountNode | null;
}

export const AccountNodeAuditModal: React.FC<AccountNodeAuditModalProps> = ({
  open,
  onClose,
  node,
}) => {
  const [logs, setLogs] = useState<AccountMenuAuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && node) {
      setLoading(true);
      fetch(`/api/account-menu/${node.id}/audit`)
        .then((res) => res.json())
        .then((data) => setLogs(data.logs || []))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [open, node]);

  if (!node) return null;

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      placement="center"
      title={`Audit History — ${node.name}`}
      description="Track complete change history, timestamps, users, and value snapshots."
    >
      <div className="space-y-4 pt-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mb-2" />
            <p className="text-xs">Loading history logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 py-10 text-center text-xs text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
            No history logs recorded yet for this item.
          </div>
        ) : (
          <div className="relative space-y-4 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {logs.map((log) => {
              const formattedDate = new Date(log.createdAt).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              });

              return (
                <div key={log.id} className="relative flex items-start gap-3 pl-8">
                  {/* Timeline Icon Node */}
                  <div className="absolute left-1.5 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
                    <CheckCircle2 className="h-3 w-3" />
                  </div>

                  <div className="flex-1 rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs dark:border-white/10 dark:bg-slate-900">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {log.action}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock className="h-3 w-3" />
                        {formattedDate}
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span>
                        Action by: <strong>{log.performedByName || "System User"}</strong>
                      </span>
                    </div>

                    {log.oldValue && (
                      <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <strong>Previous: </strong>
                        <pre className="mt-0.5 overflow-x-auto rounded bg-slate-50 p-1.5 font-mono text-[10px] text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                          {JSON.stringify(log.oldValue, null, 2)}
                        </pre>
                      </div>
                    )}

                    {log.newValue && (
                      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <strong>Updated: </strong>
                        <pre className="mt-0.5 overflow-x-auto rounded bg-slate-50 p-1.5 font-mono text-[10px] text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                          {JSON.stringify(log.newValue, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </FormDrawer>
  );
};
