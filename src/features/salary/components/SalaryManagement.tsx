"use client";

import {
  BadgeDollarSign,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileClock,
  Loader2,
  Users,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { readJsonResponse } from "@/utils/fetch";
import type { UserAccessRow } from "@/features/admin/types/rbac.types";
import type {
  SalaryCalculateResponse,
  SalaryDashboardResponse,
  SalaryPayrollRow,
  SalaryReportsResponse,
} from "@/features/salary/types/salary.types";

type SalaryModuleProps = {
  mode: "dashboard" | "calculator" | "payroll" | "reports";
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function currentMonth() {
  const now = new Date();
  return now.getMonth() + 1;
}

function currentYear() {
  return new Date().getFullYear();
}

function money(value: string | number) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function dayCount(value: number) {
  return Number.isFinite(value) ? value.toFixed(2).replace(/\.00$/, "") : "0";
}

function summaryCards(summary: SalaryDashboardResponse["summary"]) {
  return [
    { label: "Employees", value: summary.employeeCount, icon: Users },
    { label: "Working Days", value: dayCount(summary.workingDaysTotal), icon: CalendarDays },
    { label: "Gross Salary", value: money(summary.grossSalaryTotal), icon: BadgeDollarSign },
    { label: "Net Payable", value: money(summary.netPayableTotal), icon: CheckCircle2 },
  ];
}

function payrollColumns(withActions: boolean, onApprove?: (row: SalaryPayrollRow) => void, approvingPayrollId?: string | null) {
  return [
    {
      key: "userName",
      label: "Employee",
      render: (row: SalaryPayrollRow) => (
        <div className="grid gap-1">
          <p className="font-semibold text-slate-900 dark:text-white">{row.userName}</p>
          <p className="text-xs text-soft">{row.userEmail}</p>
          <p className="text-xs text-soft">{row.department}  {row.officeLocation}</p>
        </div>
      ),
    },
    { key: "payrollStatus", label: "Status" },
    {
      key: "workingDays",
      label: "Working Days",
      render: (row: SalaryPayrollRow) => dayCount(row.workingDays),
    },
    {
      key: "presentDays",
      label: "Present",
      render: (row: SalaryPayrollRow) => dayCount(row.presentDays),
    },
    {
      key: "paidLeaveDays",
      label: "Paid Leave",
      render: (row: SalaryPayrollRow) => dayCount(row.paidLeaveDays),
    },
    {
      key: "unpaidLeaveDays",
      label: "Unpaid Leave",
      render: (row: SalaryPayrollRow) => dayCount(row.unpaidLeaveDays),
    },
    { key: "grossSalary", label: "Gross", render: (row: SalaryPayrollRow) => money(row.grossSalary) },
    { key: "netPayable", label: "Net", render: (row: SalaryPayrollRow) => money(row.netPayable) },
    {
      key: "generatedAt",
      label: "Generated",
      render: (row: SalaryPayrollRow) => row.generatedAt ?? "-",
    },
    {
      key: "actions",
      label: "Actions",
      render: (row: SalaryPayrollRow) =>
        withActions ? (
          <Button
            size="sm"
            variant={row.payrollStatus === "Approved" || row.payrollStatus === "Paid" ? "secondary" : "primary"}
            disabled={row.payrollStatus === "Approved" || row.payrollStatus === "Paid" || row.id === approvingPayrollId}
            onClick={() => onApprove?.(row)}
          >
            {row.payrollStatus === "Approved" || row.payrollStatus === "Paid" ? "Approved" : "Approve"}
          </Button>
        ) : (
          row.notes ?? "-"
        ),
    },
  ];
}

export function SalaryManagement({ mode }: SalaryModuleProps) {
  const [month, setMonth] = useState(currentMonth());
  const [year, setYear] = useState(currentYear());
  const [users, setUsers] = useState<UserAccessRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [dashboardData, setDashboardData] = useState<SalaryDashboardResponse | null>(null);
  const [reportsData, setReportsData] = useState<SalaryReportsResponse | null>(null);
  const [calculationData, setCalculationData] = useState<SalaryCalculateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approvingPayrollId, setApprovingPayrollId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (mode !== "calculator") {
      return;
    }

    const loadUsers = async () => {
      setLoadingUsers(true);
      try {
        const response = await fetch("/api/users", { cache: "no-store" });
        const payload = await readJsonResponse<{ users?: UserAccessRow[]; message?: string }>(response);
        if (!response.ok) {
          throw new Error(payload.message ?? "Unable to load users.");
        }

        const availableUsers = (payload.users ?? []).filter((user) => Number(user.monthlySalary ?? 0) >= 0);
        setUsers(availableUsers);
        setSelectedUserId((current) => current || availableUsers[0]?.id || "");
      } catch (loadError) {
        console.error("Failed to load salary users", loadError);
        setError(loadError instanceof Error ? loadError.message : "Unable to load users.");
      } finally {
        setLoadingUsers(false);
      }
    };

    void loadUsers();
  }, [mode]);

  useEffect(() => {
    if (mode === "calculator") {
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setError("");

      try {
        const endpoint =
          mode === "dashboard"
            ? `/api/salary/dashboard?month=${month}&year=${year}`
            : `/api/salary/reports?month=${month}&year=${year}`;
        const response = await fetch(endpoint, { cache: "no-store" });
        const payload =
          mode === "dashboard"
            ? await readJsonResponse<SalaryDashboardResponse & { message?: string }>(response)
            : await readJsonResponse<SalaryReportsResponse & { message?: string }>(response);

        if (!response.ok) {
          throw new Error(payload.message ?? "Unable to load salary data.");
        }

        if (mode === "dashboard") {
          setDashboardData(payload as SalaryDashboardResponse);
        } else {
          setReportsData(payload as SalaryReportsResponse);
        }
      } catch (loadError) {
        console.error("Failed to load salary data", loadError);
        setError(loadError instanceof Error ? loadError.message : "Unable to load salary data.");
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [mode, month, year]);

  async function handleCalculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedUserId) {
      setError("Please select an employee before calculating salary.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/salary/calculate?month=${month}&year=${year}&userId=${encodeURIComponent(selectedUserId)}`,
        { cache: "no-store" },
      );
      const payload = await readJsonResponse<SalaryCalculateResponse & { message?: string }>(response);

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to calculate salary.");
      }

      setCalculationData(payload);
      setMessage("Salary preview generated successfully.");
    } catch (calculateError) {
      console.error("Failed to calculate salary", calculateError);
      setError(calculateError instanceof Error ? calculateError.message : "Unable to calculate salary.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGenerate() {
    if (!selectedUserId) {
      setError("Please select an employee before generating payroll.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/salary/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year, userId: selectedUserId }),
      });
      const payload = await readJsonResponse<{ message?: string; generated?: SalaryPayrollRow[] }>(response);

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to generate payroll.");
      }

      setMessage("Payroll generated successfully.");
      await handleCalculate(new Event("submit") as unknown as FormEvent<HTMLFormElement>);
    } catch (generateError) {
      console.error("Failed to generate payroll", generateError);
      setError(generateError instanceof Error ? generateError.message : "Unable to generate payroll.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove(row: SalaryPayrollRow) {
    setApprovingPayrollId(row.id);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/salary/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payrollId: row.id }),
      });
      const payload = await readJsonResponse<{ message?: string; payroll?: SalaryPayrollRow }>(response);

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to approve payroll.");
      }

      setMessage(`Payroll approved for ${row.userName}.`);
      if (mode === "dashboard") {
        const refresh = await fetch(`/api/salary/dashboard?month=${month}&year=${year}`, { cache: "no-store" });
        const refreshed = await readJsonResponse<SalaryDashboardResponse & { message?: string }>(refresh);
        if (refresh.ok) {
          setDashboardData(refreshed);
        }
      }
      if (mode === "payroll" || mode === "reports") {
        const refresh = await fetch(`/api/salary/reports?month=${month}&year=${year}`, { cache: "no-store" });
        const refreshed = await readJsonResponse<SalaryReportsResponse & { message?: string }>(refresh);
        if (refresh.ok) {
          setReportsData(refreshed);
        }
      }
    } catch (approveError) {
      console.error("Failed to approve payroll", approveError);
      setError(approveError instanceof Error ? approveError.message : "Unable to approve payroll.");
    } finally {
      setApprovingPayrollId(null);
    }
  }

  const dashboardSummary = dashboardData?.summary;
  const reportSummary = reportsData?.summary;
  const payrollRows = mode === "dashboard" ? dashboardData?.recentPayrolls ?? [] : reportsData?.rows ?? [];
  const calculationRows = calculationData?.calculations ?? dashboardData?.calculations ?? [];

  const summaryCardsData =
    mode === "dashboard"
      ? summaryCards(dashboardSummary ?? {
          employeeCount: 0,
          payrollCount: 0,
          generatedCount: 0,
          approvedCount: 0,
          paidCount: 0,
          workingDaysTotal: 0,
          presentDaysTotal: 0,
          paidLeaveDaysTotal: 0,
          unpaidLeaveDaysTotal: 0,
          lopDaysTotal: 0,
          grossSalaryTotal: "0",
          earnedSalaryTotal: "0",
          lopDeductionTotal: "0",
          netPayableTotal: "0",
        })
      : mode === "reports"
        ? [
            { label: "Report Rows", value: reportSummary?.payrollCount ?? 0, icon: FileClock },
            { label: "Generated", value: reportSummary?.generatedCount ?? 0, icon: Clock3 },
            { label: "Approved", value: reportSummary?.approvedCount ?? 0, icon: CheckCircle2 },
            { label: "Net Payable", value: money(reportSummary?.netPayableTotal ?? "0"), icon: BadgeDollarSign },
          ]
        : [
            { label: "Employees", value: calculationRows.length, icon: Users },
            { label: "Working Days", value: dayCount(calculationData?.summary.workingDaysTotal ?? 0), icon: CalendarDays },
            { label: "Gross Salary", value: money(calculationData?.summary.grossSalaryTotal ?? "0"), icon: BadgeDollarSign },
            { label: "Net Payable", value: money(calculationData?.summary.netPayableTotal ?? "0"), icon: CheckCircle2 },
          ];

  const showPayrollTable = mode === "dashboard" || mode === "payroll" || mode === "reports";
  const tableRows = mode === "dashboard" ? payrollRows : mode === "payroll" || mode === "reports" ? payrollRows : [];

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <DashboardCard>
        <div className="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
          <Input label="Month" type="number" min="1" max="12" value={String(month)} onChange={(event) => setMonth(Number(event.target.value || currentMonth()))} />
          <Input label="Year" type="number" min="2020" max="2100" value={String(year)} onChange={(event) => setYear(Number(event.target.value || currentYear()))} />
          {mode === "calculator" ? (
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white">Employee</span>
              <select
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                className="h-12 min-w-0 rounded-2xl border border-(--border) bg-white/80 px-4 text-sm outline-none focus:border-blue-500/35 focus:ring-4 focus:ring-[color:var(--ring)] dark:bg-white/5"
              >
                <option value="">Select employee</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} - {money(user.monthlySalary)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="flex flex-wrap items-center gap-3 md:justify-end">
              <p className="text-sm font-semibold text-soft">
                {MONTHS[month - 1]} {year}
              </p>
            </div>
          )}
        </div>
      </DashboardCard>

      {message ? (
        <DashboardCard>
          <p className="text-sm font-semibold text-emerald-600">{message}</p>
        </DashboardCard>
      ) : null}

      {error ? (
        <DashboardCard>
          <p className="text-sm font-semibold text-rose-600">{error}</p>
        </DashboardCard>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCardsData.map((card) => (
          <DashboardCard key={card.label}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-soft">{card.label}</p>
                <p className="mt-2 text-2xl font-extrabold text-slate-950 dark:text-white">{card.value}</p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-200">
                <card.icon size={20} />
              </span>
            </div>
          </DashboardCard>
        ))}
      </div>

      {mode === "calculator" ? (
        <DashboardCard title="Salary Calculator" description="Preview the monthly salary using attendance and leave records only.">
          {loadingUsers ? (
            <LoadingSkeleton className="h-20 w-full" />
          ) : (
            <form className="grid gap-4" onSubmit={handleCalculate}>
              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                  Calculate Salary
                </Button>
                <Button type="button" variant="secondary" disabled={submitting || !selectedUserId} onClick={() => void handleGenerate()}>
                  Generate Payroll
                </Button>
              </div>
            </form>
          )}
        </DashboardCard>
      ) : null}

      {mode === "calculator" && calculationData ? (
        <DashboardCard title="Salary Preview" description="Generated from actual attendance and leave records.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {calculationData.calculations.map((row) => (
              <DashboardCard key={row.userId} title={row.userName} description={`${row.department}  ${row.officeLocation}`}>
                <div className="grid gap-2 text-sm text-soft">
                  <p>Present: {dayCount(row.presentDays)}</p>
                  <p>Paid Leave: {dayCount(row.paidLeaveDays)}</p>
                  <p>Unpaid Leave: {dayCount(row.unpaidLeaveDays)}</p>
                  <p>Lop: {dayCount(row.lopDays)}</p>
                  <p>Gross: {money(row.grossSalary)}</p>
                  <p>Net: {money(row.netPayable)}</p>
                </div>
              </DashboardCard>
            ))}
          </div>
        </DashboardCard>
      ) : null}

      {showPayrollTable ? (
        <DashboardCard
          title={mode === "dashboard" ? "Recent Payrolls" : mode === "payroll" ? "Monthly Payroll" : "Salary Reports"}
          description="Payroll snapshots stay fixed even if the source salary changes later."
        >
          {loading ? (
            <div className="grid gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <LoadingSkeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          ) : tableRows.length === 0 ? (
            <EmptyState
              icon={FileClock}
              title="No payroll records"
              description="Generate payroll for a month to populate this view."
            />
          ) : (
            <DataTable
              keyField="id"
              rows={tableRows}
              columns={payrollColumns(mode !== "reports", (row) => void handleApprove(row), approvingPayrollId)}
            />
          )}
        </DashboardCard>
      ) : null}

      {mode === "calculator" ? null : loading ? (
        <DashboardCard>
          <div className="grid gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <LoadingSkeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        </DashboardCard>
      ) : null}
    </div>
  );
}






