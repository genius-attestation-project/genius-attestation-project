"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { DataTable } from "@/components/ui/DataTable";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import type { DepartmentRow, OfficeLocationRow, UserAccessRow } from "@/features/admin/types/rbac.types";
import type { LeaveRequestRow } from "@/features/leave/types/leave.types";
import { readJsonResponse } from "@/utils/fetch";

type FilterPayload = {
  users: UserAccessRow[];
  departments: DepartmentRow[];
  officeLocations: OfficeLocationRow[];
};

export function LeaveReportsManagement() {
  const currentDate = new Date();
  const [filters, setFilters] = useState<FilterPayload>({ users: [], departments: [], officeLocations: [] });
  const [rows, setRows] = useState<LeaveRequestRow[]>([]);
  const [stats, setStats] = useState({ approved: 0, rejected: 0, pending: 0, cancelled: 0 });
  const [query, setQuery] = useState({ userId: "", departmentId: "", officeLocationId: "", month: String(currentDate.getMonth() + 1), year: String(currentDate.getFullYear()) });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/leaves/filters", { cache: "no-store" })
      .then(async (response) => {
        const payload = await readJsonResponse<FilterPayload & { message?: string }>(response);
        if (!response.ok) throw new Error(payload.message ?? "Unable to load leave filters.");
        setFilters({ users: payload.users ?? [], departments: payload.departments ?? [], officeLocations: payload.officeLocations ?? [] });
      })
      .catch((error) => {
        console.error("Failed to load leave filters", error);
      });
  }, []);

  async function loadReport() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams(query);
      const response = await fetch(`/api/leaves/reports?${params.toString()}`, { cache: "no-store" });
      const payload = await readJsonResponse<{ rows?: LeaveRequestRow[]; stats?: { approved: number; rejected: number; pending: number; cancelled: number }; message?: string }>(response);
      if (!response.ok) throw new Error(payload.message ?? "Unable to load leave reports.");
      setRows(payload.rows ?? []);
      setStats(payload.stats ?? { approved: 0, rejected: 0, pending: 0, cancelled: 0 });
    } catch (loadError) {
      console.error("Failed to load leave reports", loadError);
      setError(loadError instanceof Error ? loadError.message : "Unable to load leave reports.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReport();
  }, []);

  return (
    <div className="grid gap-6">
      <DashboardCard title="Leave Reports" description="Review permanent leave history with workspace filters.">
        <div className="grid gap-3 md:grid-cols-5">
          <label className="grid gap-2 text-sm font-bold">
            <span>User</span>
            <select className="h-12 rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 text-sm dark:bg-white/5" value={query.userId} onChange={(event) => setQuery((current) => ({ ...current, userId: event.target.value }))}>
              <option value="">All users</option>
              {filters.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold">
            <span>Department</span>
            <select className="h-12 rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 text-sm dark:bg-white/5" value={query.departmentId} onChange={(event) => setQuery((current) => ({ ...current, departmentId: event.target.value }))}>
              <option value="">All departments</option>
              {filters.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold">
            <span>Office</span>
            <select className="h-12 rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 text-sm dark:bg-white/5" value={query.officeLocationId} onChange={(event) => setQuery((current) => ({ ...current, officeLocationId: event.target.value }))}>
              <option value="">All offices</option>
              {filters.officeLocations.map((office) => <option key={office.id} value={office.id}>{office.officeName}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold">
            <span>Month</span>
            <input type="number" min="1" max="12" className="h-12 rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 text-sm dark:bg-white/5" value={query.month} onChange={(event) => setQuery((current) => ({ ...current, month: event.target.value }))} />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            <span>Year</span>
            <input type="number" min="2020" max="2100" className="h-12 rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 text-sm dark:bg-white/5" value={query.year} onChange={(event) => setQuery((current) => ({ ...current, year: event.target.value }))} />
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="button" onClick={() => void loadReport()}>Run Report</Button>
        </div>
      </DashboardCard>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Approved Leaves", stats.approved, "text-blue-600"],
          ["Rejected Leaves", stats.rejected, "text-rose-600"],
          ["Pending Leaves", stats.pending, "text-violet-600"],
          ["Cancelled Leaves", stats.cancelled, "text-slate-600"],
        ].map(([label, value, color]) => (
          <DashboardCard key={String(label)}>
            <p className={`text-3xl font-extrabold ${String(color)}`}>{String(value)}</p>
            <p className="mt-1 text-sm text-soft">{String(label)}</p>
          </DashboardCard>
        ))}
      </div>

      <DashboardCard title="Leave Report Rows" description="All saved leave approvals, rejections, and cancellations remain in history.">
        {error ? <p className="mb-4 text-sm font-semibold text-rose-600">{error}</p> : null}
        {loading ? (
          <div className="grid gap-3">{Array.from({ length: 6 }).map((_, index) => <LoadingSkeleton key={index} className="h-14 w-full rounded-2xl" />)}</div>
        ) : (
          <DataTable keyField="id" rows={rows} columns={[
            { key: "userName", label: "Employee" },
            { key: "department", label: "Department" },
            { key: "officeLocation", label: "Office" },
            { key: "leaveType", label: "Leave Type" },
            { key: "fromDate", label: "From Date" },
            { key: "toDate", label: "To Date" },
            { key: "totalDays", label: "Days" },
            { key: "status", label: "Status" },
            { key: "appliedAt", label: "Applied" },
          ]} />
        )}
      </DashboardCard>
    </div>
  );
}
