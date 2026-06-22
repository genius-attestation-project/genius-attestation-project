"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import type { LeaveRequestRow } from "@/features/leave/types/leave.types";
import { CalendarDays } from "lucide-react";

export function LeaveRequestsManagement() {
  const [rows, setRows] = useState<LeaveRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRows() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/leaves/my", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Unable to load leave requests.");
      setRows(payload.rows ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load leave requests.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRows();
  }, []);

  async function cancelRequest(row: LeaveRequestRow) {
    const confirmed = window.confirm(`Cancel leave request from ${row.fromDate} to ${row.toDate}?`);
    if (!confirmed) return;
    try {
      const response = await fetch(`/api/leaves/${row.id}/cancel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: "Cancelled by user." }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Unable to cancel leave request.");
      await loadRows();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Unable to cancel leave request.");
    }
  }

  return (
    <DashboardCard title="Leave Requests" description="Track your submitted leave requests and current approval status.">
      {error ? <p className="mb-4 text-sm font-semibold text-rose-600">{error}</p> : null}
      {loading ? (
        <div className="grid gap-3">{Array.from({ length: 5 }).map((_, index) => <LoadingSkeleton key={index} className="h-14 w-full rounded-2xl" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No leave requests" description="Leave requests you submit will appear here." />
      ) : (
        <DataTable
          keyField="id"
          rows={rows}
          columns={[
            { key: "leaveType", label: "Leave Type" },
            { key: "fromDate", label: "From Date" },
            { key: "toDate", label: "To Date" },
            { key: "totalDays", label: "Days" },
            { key: "reason", label: "Reason" },
            {
              key: "status",
              label: "Status",
              render: (row) => <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold dark:bg-white/10">{String(row.status)}</span>,
            },
            {
              key: "actions",
              label: "Actions",
              render: (row) => row.status === "Pending" ? <Button variant="danger" size="sm" onClick={() => void cancelRequest(row as LeaveRequestRow)}>Cancel</Button> : <span className="text-sm text-soft">-</span>,
            },
          ]}
        />
      )}
    </DashboardCard>
  );
}
