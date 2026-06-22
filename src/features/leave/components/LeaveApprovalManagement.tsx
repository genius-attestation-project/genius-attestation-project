"use client";

import { useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import type { LeaveRequestRow } from "@/features/leave/types/leave.types";

export function LeaveApprovalManagement() {
  const [rows, setRows] = useState<LeaveRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRows() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/leaves/pending", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Unable to load pending leave requests.");
      setRows(payload.rows ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load pending leave requests.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRows();
  }, []);

  async function handleDecision(id: string, action: "approve" | "reject") {
    const promptText = action === "approve" ? "Approval note" : "Rejection reason";
    const note = window.prompt(promptText);
    if (!note) return;

    try {
      const response = await fetch(`/api/leaves/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? `Unable to ${action} leave request.`);
      await loadRows();
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : `Unable to ${action} leave request.`);
    }
  }

  return (
    <DashboardCard title="Leave Approval" description="Approve or reject pending leave requests.">
      {error ? <p className="mb-4 text-sm font-semibold text-rose-600">{error}</p> : null}
      {loading ? (
        <div className="grid gap-3">{Array.from({ length: 5 }).map((_, index) => <LoadingSkeleton key={index} className="h-14 w-full rounded-2xl" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={BadgeCheck} title="No pending leave requests" description="Pending requests will appear here for review." />
      ) : (
        <DataTable
          keyField="id"
          rows={rows}
          columns={[
            { key: "userName", label: "Employee" },
            { key: "department", label: "Department" },
            { key: "officeLocation", label: "Office Location" },
            { key: "leaveType", label: "Leave Type" },
            { key: "fromDate", label: "From Date" },
            { key: "toDate", label: "To Date" },
            { key: "totalDays", label: "Days" },
            { key: "reason", label: "Reason" },
            { key: "appliedAt", label: "Applied Date" },
            {
              key: "actions",
              label: "Actions",
              render: (row) => {
                const leave = row as LeaveRequestRow;
                return (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => void handleDecision(leave.id, "approve")}>Approve</Button>
                    <Button size="sm" variant="danger" onClick={() => void handleDecision(leave.id, "reject")}>Reject</Button>
                  </div>
                );
              },
            },
          ]}
        />
      )}
    </DashboardCard>
  );
}
