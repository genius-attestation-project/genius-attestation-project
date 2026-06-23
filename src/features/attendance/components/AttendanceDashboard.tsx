"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, FileClock, Loader2, PlaneTakeoff, RotateCcw, UserCheck, Users } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import type {
  AttendanceCalendarDay,
  AttendanceCalendarDetail,
  AttendanceCalendarOverview,
  AttendanceCalendarResponse,
  AttendanceCalendarSummary,
  AttendanceStats,
  CalendarDisplayStatus,
} from "@/features/attendance/types/attendance.types";
import type { DepartmentRow, OfficeLocationRow, UserAccessRow } from "@/features/admin/types/rbac.types";
import { readJsonResponse } from "@/utils/fetch";

type Props = {
  canViewAll: boolean;
};

type FilterPayload = {
  users: UserAccessRow[];
  departments: DepartmentRow[];
  officeLocations: OfficeLocationRow[];
};

type CalendarFilters = {
  userId: string;
  departmentId: string;
  officeLocationId: string;
};

type CalendarCellStatus = CalendarDisplayStatus | null;

type CalendarCell = {
  date: string;
  dayNumber: number;
  inMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  status: CalendarCellStatus;
  badgeLabel: string;
  badgeClassName: string;
  summaryCount: number;
  summaries: AttendanceCalendarSummary[];
  details: AttendanceCalendarDetail[];
};

const CARD_CONFIG = [
  { key: "presentToday", label: "Present Today", color: "text-emerald-600", bg: "bg-emerald-50", icon: UserCheck },
  { key: "absentToday", label: "Absent Today", color: "text-rose-600", bg: "bg-rose-50", icon: Users },
  { key: "onLeaveToday", label: "On Leave Today", color: "text-blue-600", bg: "bg-blue-50", icon: PlaneTakeoff },
  { key: "lateToday", label: "Late Today", color: "text-orange-600", bg: "bg-orange-50", icon: Clock3 },
  { key: "pendingLeaveRequests", label: "Pending Leave Requests", color: "text-violet-600", bg: "bg-violet-50", icon: FileClock },
  { key: "approvedLeavesThisMonth", label: "Approved Leaves This Month", color: "text-sky-600", bg: "bg-sky-50", icon: CalendarDays },
] as const;

const STATUS_META: Partial<Record<CalendarDisplayStatus, { label: string; badgeClassName: string }>> = {
  Present: { label: "Present", badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  Absent: { label: "Absent", badgeClassName: "border-rose-200 bg-rose-50 text-rose-700" },
  Late: { label: "Late", badgeClassName: "border-orange-200 bg-orange-50 text-orange-700" },
  "Half Day": { label: "Half Day", badgeClassName: "border-amber-200 bg-amber-50 text-amber-700" },
  "Approved Leave": { label: "Leave", badgeClassName: "border-blue-200 bg-blue-50 text-blue-700" },
  "Pending Leave": { label: "Pending", badgeClassName: "border-violet-200 bg-violet-50 text-violet-700" },
  "Rejected Leave": { label: "Rejected", badgeClassName: "border-slate-200 bg-slate-100 text-slate-600" },
};

const MONTH_NAMES = [
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

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function isoDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonthLabel(year: number, month: number) {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

function getYearOptions() {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 7 }, (_, index) => currentYear - 3 + index);
}

function getMonthGridStart(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function getPrimarySummary(summaries: AttendanceCalendarSummary[]) {
  if (summaries.length === 0) return null;

  return summaries.reduce((best, current) => {
    if (current.count !== best.count) {
      return current.count > best.count ? current : best;
    }

    const priority = (status: CalendarDisplayStatus) => {
      switch (status) {
        case "Present":
          return 8;
        case "Late":
          return 7;
        case "Half Day":
          return 6;
        case "Approved Leave":
          return 5;
        case "Pending Leave":
          return 4;
        case "Rejected Leave":
          return 3;
        case "Holiday":
          return 2;
        case "Absent":
        default:
          return 1;
      }
    };

    return priority(current.status) > priority(best.status) ? current : best;
  });
}

function buildCalendarCells(
  year: number,
  month: number,
  days: AttendanceCalendarDay[],
): CalendarCell[] {
  const dayMap = new Map(days.map((day) => [day.date, day]));
  const gridStart = getMonthGridStart(year, month);
  const todayIso = isoDate(new Date());
  const monthIndex = month - 1;

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const key = isoDate(date);
    const currentDay = dayMap.get(key);
    const primarySummary = getPrimarySummary(currentDay?.summaries ?? []);
    const inMonth = date.getMonth() === monthIndex;
    const status: CalendarCellStatus = inMonth ? primarySummary?.status ?? null : null;
    const meta = status ? STATUS_META[status] : null;

    return {
      date: key,
      dayNumber: date.getDate(),
      inMonth,
      isToday: key === todayIso,
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      status,
      badgeLabel: meta?.label ?? "",
      badgeClassName: meta?.badgeClassName ?? "",
      summaryCount: primarySummary?.count ?? 0,
      summaries: currentDay?.summaries ?? [],
      details: currentDay?.details ?? [],
    };
  });
}

function formatDateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getSummaryCards(summary: AttendanceCalendarOverview | null) {
  return [
    { label: "Present", value: summary?.present ?? 0, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Absent", value: summary?.absent ?? 0, color: "text-rose-600", bg: "bg-rose-50" },
    { label: "Late", value: summary?.late ?? 0, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Leave", value: summary?.leave ?? 0, color: "text-blue-600", bg: "bg-blue-50" },
  ];
}

export function AttendanceDashboard({ canViewAll }: Props) {
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [calendarData, setCalendarData] = useState<AttendanceCalendarResponse | null>(null);
  const [filters, setFilters] = useState<FilterPayload>({ users: [], departments: [], officeLocations: [] });
  const [loading, setLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date().getMonth() + 1);
  const [visibleYear, setVisibleYear] = useState(() => new Date().getFullYear());
  const [draftFilters, setDraftFilters] = useState<CalendarFilters>({ userId: "", departmentId: "", officeLocationId: "" });
  const [appliedFilters, setAppliedFilters] = useState<CalendarFilters>({ userId: "", departmentId: "", officeLocationId: "" });
  const [reloadNonce, setReloadNonce] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestSequenceRef = useRef(0);
  const activeRequestRef = useRef(0);
  const selectedDateRef = useRef<string | null>(null);

  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  useEffect(() => {
    void fetch("/api/attendance/stats", { cache: "no-store" })
      .then(async (response) => {
        const payload = await readJsonResponse<{ stats?: AttendanceStats; message?: string }>(response);
        if (!response.ok) throw new Error(payload.message ?? "Unable to load attendance stats.");
        setStats(payload.stats ?? null);
      })
      .catch((error) => {
        console.error("Failed to load attendance stats", error);
        setStats(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!canViewAll) return;

    void fetch("/api/leaves/filters", { cache: "no-store" })
      .then(async (response) => {
        const payload = await readJsonResponse<FilterPayload & { message?: string }>(response);
        if (!response.ok) throw new Error(payload.message ?? "Unable to load leave filters.");
        setFilters({
          users: payload.users ?? [],
          departments: payload.departments ?? [],
          officeLocations: payload.officeLocations ?? [],
        });
      })
      .catch((error) => {
        console.error("Failed to load leave filters", error);
      });
  }, [canViewAll]);

  useEffect(() => {
    console.log("Calendar mounted");

    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const requestId = ++requestSequenceRef.current;
    activeRequestRef.current = requestId;
    const controller = new AbortController();
    abortControllerRef.current?.abort();
    abortControllerRef.current = controller;

    const timeoutId = window.setTimeout(() => {
      controller.abort(new Error("Calendar request timed out after 10 seconds."));
    }, 10000);

    const loadCalendar = async () => {
      const params = new URLSearchParams({
        month: String(visibleMonth),
        year: String(visibleYear),
      });

      if (canViewAll) {
        if (appliedFilters.userId) params.set("userId", appliedFilters.userId);
        if (appliedFilters.departmentId) params.set("departmentId", appliedFilters.departmentId);
        if (appliedFilters.officeLocationId) params.set("officeLocationId", appliedFilters.officeLocationId);
      }

      console.log("Fetching calendar", {
        month: visibleMonth,
        year: visibleYear,
        userId: appliedFilters.userId || null,
        departmentId: appliedFilters.departmentId || null,
        officeLocationId: appliedFilters.officeLocationId || null,
      });

      setCalendarLoading(true);
      setCalendarError(null);

      try {
        const response = await fetch(`/api/attendance/calendar?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        console.log("Calendar response received", response);

        const payload = await readJsonResponse<AttendanceCalendarResponse & { success?: boolean; message?: string }>(response);
        if (!response.ok) throw new Error(payload.message ?? "Unable to load attendance calendar.");

        console.log("Calendar state updated", {
          month: payload.month,
          year: payload.year,
          dayCount: payload.days?.length ?? 0,
          summary: payload.summary,
        });

        if (activeRequestRef.current !== requestId) return;

        setCalendarData(payload);
        const monthPrefix = `${String(payload.year)}-${String(payload.month).padStart(2, "0")}`;
        const todayIso = isoDate(new Date());
        const currentSelection = selectedDateRef.current;
        const nextSelection =
          currentSelection && currentSelection.startsWith(monthPrefix) && (payload.days ?? []).some((day) => day.date === currentSelection)
            ? currentSelection
            : (payload.days ?? []).some((day) => day.date === todayIso)
              ? todayIso
              : payload.days?.[0]?.date ?? null;
        setSelectedDate(nextSelection);
      } catch (error) {
        if (controller.signal.aborted) {
          const reason = controller.signal.reason;
          const timeoutMessage = reason instanceof Error ? reason.message : null;
          if (timeoutMessage?.includes("timed out")) {
            console.error("Failed to load attendance calendar", reason);
            if (activeRequestRef.current === requestId) {
              setCalendarError(timeoutMessage);
            }
          } else {
            console.warn("Calendar fetch aborted", error);
          }
          return;
        }

        console.error("Failed to load attendance calendar", error);
        if (activeRequestRef.current === requestId) {
          setCalendarError(error instanceof Error ? error.message : "Unable to load attendance calendar.");
        }
      } finally {
        window.clearTimeout(timeoutId);
        if (activeRequestRef.current === requestId) {
          setCalendarLoading(false);
        }
      }
    };

    void loadCalendar();
  }, [appliedFilters.departmentId, appliedFilters.officeLocationId, appliedFilters.userId, canViewAll, reloadNonce, visibleMonth, visibleYear]);

  const calendarDays = calendarData?.days ?? [];
  const calendarCells = useMemo(() => buildCalendarCells(visibleYear, visibleMonth, calendarDays), [calendarDays, visibleMonth, visibleYear]);
  const selectedDay = useMemo(() => calendarDays.find((day) => day.date === selectedDate) ?? null, [calendarDays, selectedDate]);
  const statCards = stats ? CARD_CONFIG.map((card) => ({ ...card, value: stats[card.key] })) : [];
  const summaryCards = getSummaryCards(calendarData?.summary ?? null);
  const currentMonthLabel = formatMonthLabel(visibleYear, visibleMonth);
  const yearOptions = useMemo(() => getYearOptions(), []);
  const initialLoading = loading || (calendarLoading && !calendarData);

  function navigateMonth(delta: number) {
    setVisibleMonth((currentMonth) => {
      const nextMonth = currentMonth + delta;
      if (nextMonth < 1) {
        setVisibleYear((year) => year - 1);
        return 12;
      }
      if (nextMonth > 12) {
        setVisibleYear((year) => year + 1);
        return 1;
      }
      return nextMonth;
    });
  }

  function goToToday() {
    const today = new Date();
    setVisibleMonth(today.getMonth() + 1);
    setVisibleYear(today.getFullYear());
  }

  function applyFilters() {
    setAppliedFilters(draftFilters);
  }

  function resetFilters() {
    const empty = { userId: "", departmentId: "", officeLocationId: "" };
    setDraftFilters(empty);
    setAppliedFilters(empty);
  }

  return (
    <div className="grid gap-6">
      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <LoadingSkeleton key={index} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-white/8 dark:bg-white/5">
                <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl ${card.bg} ${card.color}`}>
                  <Icon size={18} />
                </div>
                <p className={`text-3xl font-extrabold ${card.color}`}>{card.value}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-white/45">{card.label}</p>
              </div>
            );
          })}
        </div>
      )}

      <DashboardCard title="Monthly Attendance Calendar" description="Browse real attendance and leave data from the database.">
        <div className="grid gap-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--border)] bg-slate-50/80 p-4 dark:bg-white/5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" size="icon" onClick={() => navigateMonth(-1)} aria-label="Previous month">
                <ChevronLeft size={16} />
              </Button>
              <Button type="button" variant="secondary" size="md" onClick={goToToday}>
                Today
              </Button>
              <Button type="button" variant="secondary" size="icon" onClick={() => navigateMonth(1)} aria-label="Next month">
                <ChevronRight size={16} />
              </Button>
              <div className="ml-1 rounded-2xl border border-[color:var(--border)] bg-white/90 px-4 py-2 text-base font-bold text-slate-900 shadow-sm dark:bg-white/5 dark:text-white">
                {currentMonthLabel}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                <span>Month</span>
                <select
                  className="h-11 rounded-2xl border border-[color:var(--border)] bg-white/90 px-4 text-sm dark:bg-white/5"
                  value={visibleMonth}
                  onChange={(event) => setVisibleMonth(Number(event.target.value))}
                >
                  {MONTH_NAMES.map((monthName, index) => (
                    <option key={monthName} value={index + 1}>
                      {monthName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                <span>Year</span>
                <select
                  className="h-11 rounded-2xl border border-[color:var(--border)] bg-white/90 px-4 text-sm dark:bg-white/5"
                  value={visibleYear}
                  onChange={(event) => setVisibleYear(Number(event.target.value))}
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {canViewAll ? (
            <div className="grid gap-3 md:grid-cols-4">
              <label className="grid gap-2 text-sm font-bold">
                <span>User</span>
                <select
                  className="h-12 rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 text-sm dark:bg-white/5"
                  value={draftFilters.userId}
                  onChange={(event) => setDraftFilters((current) => ({ ...current, userId: event.target.value }))}
                >
                  <option value="">All users</option>
                  {filters.users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold">
                <span>Department</span>
                <select
                  className="h-12 rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 text-sm dark:bg-white/5"
                  value={draftFilters.departmentId}
                  onChange={(event) => setDraftFilters((current) => ({ ...current, departmentId: event.target.value }))}
                >
                  <option value="">All departments</option>
                  {filters.departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold">
                <span>Office</span>
                <select
                  className="h-12 rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 text-sm dark:bg-white/5"
                  value={draftFilters.officeLocationId}
                  onChange={(event) => setDraftFilters((current) => ({ ...current, officeLocationId: event.target.value }))}
                >
                  <option value="">All offices</option>
                  {filters.officeLocations.map((office) => (
                    <option key={office.id} value={office.id}>
                      {office.officeName}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end gap-2">
                <Button type="button" className="w-full" onClick={applyFilters}>
                  Apply Filters
                </Button>
                <Button type="button" variant="secondary" size="icon" onClick={resetFilters} aria-label="Reset filters">
                  <RotateCcw size={16} />
                </Button>
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-4">
            {summaryCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-[color:var(--border)] bg-white/80 p-4 shadow-sm dark:bg-white/5">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${card.bg} ${card.color}`}>
                  <CalendarDays size={18} />
                </div>
                <p className={`mt-3 text-2xl font-extrabold ${card.color}`}>{card.value}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-white/45">{card.label}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
            <div className="relative min-w-0 overflow-hidden rounded-3xl border border-[color:var(--border)] bg-white/90 p-4 dark:bg-white/5">
              {calendarError ? (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10">
                  <span>{calendarError}</span>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setReloadNonce((value) => value + 1)}>
                    Retry
                  </Button>
                </div>
              ) : null}

              {initialLoading ? (
                <div className="flex h-[680px] items-center justify-center rounded-3xl border border-dashed border-[color:var(--border)] bg-slate-50/60 text-sm text-soft dark:bg-white/5">
                  <Loader2 className="mr-2 animate-spin" size={18} /> Loading calendar...
                </div>
              ) : calendarData && calendarCells.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-white/40">
                    {DAY_LABELS.map((label) => (
                      <div key={label} className="py-1">{label}</div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {calendarCells.map((cell) => {
                      const selected = cell.date === selectedDate;
                      const cellTone = "bg-white/95";
                      const selectionTone = selected ? "border-blue-500 shadow-[0_0_0_1px_rgba(59,130,246,0.18)]" : "border-[color:var(--border)]";
                      const mutedTone = cell.inMonth ? "" : "opacity-45";
                      return (
                        <button
                          key={cell.date}
                          type="button"
                          onClick={() => setSelectedDate(cell.date)}
                          className={`group min-h-32 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${cellTone} ${selectionTone} ${mutedTone} ${cell.isToday ? "ring-2 ring-blue-500/25" : ""}`}
                        >
                          <div className="flex flex-col items-start gap-2">
                            <span className={`text-sm font-extrabold ${cell.inMonth ? "text-slate-900 dark:text-white" : "text-slate-400"}`}>
                              {cell.dayNumber}
                            </span>
                            {cell.isToday ? (
                              <span className="inline-flex w-fit rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700">
                                Today
                              </span>
                            ) : null}
                          </div>

                          {cell.summaries.length > 0 ? (
                            <div className="mt-3 flex justify-start">
                              <span className={`inline-flex max-w-full items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${cell.badgeClassName}`}>
                                {cell.badgeLabel}
                                {cell.summaryCount > 1 ? ` (${cell.summaryCount})` : ""}
                              </span>
                            </div>
                          ) : null}

                          {cell.inMonth && cell.summaries.length > 1 ? (
                            <div className="mt-3 space-y-1.5">
                              {cell.summaries.slice(0, 3).map((summary) => (
                                <div key={`${cell.date}-${summary.status}`} className="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-500 dark:text-white/50">
                                  <span>{summary.label}</span>
                                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: summary.color }} />
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex h-[680px] items-center justify-center rounded-3xl border border-dashed border-[color:var(--border)] bg-slate-50/60 text-sm text-soft dark:bg-white/5">
                  No attendance records found for {currentMonthLabel}.
                </div>
              )}

              {calendarLoading && calendarData ? (
                <div className="absolute inset-4 flex items-center justify-center rounded-3xl bg-white/70 text-sm text-soft backdrop-blur-sm dark:bg-slate-950/50">
                  <Loader2 className="mr-2 animate-spin" size={18} /> Loading calendar...
                </div>
              ) : null}
            </div>

            <DashboardCard
              title={selectedDay ? `Attendance Details - ${formatDateLabel(selectedDay.date)}` : "Attendance Details"}
              description="Date-wise attendance, leave, and approval context."
            >
              {!selectedDay ? (
                <p className="text-sm text-soft">Select a date from the calendar to inspect user-level attendance details.</p>
              ) : selectedDay.details.length === 0 ? (
                <p className="text-sm text-soft">No records found for this date.</p>
              ) : (
                <div className="grid gap-3">
                  {selectedDay.details.map((detail) => (
                    <div key={`${detail.userId}-${detail.date}`} className="rounded-2xl border border-[color:var(--border)] bg-white/80 p-4 shadow-sm dark:bg-white/5">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{detail.userName}</p>
                          <p className="text-xs text-soft">{detail.department} - {detail.officeLocation}</p>
                          {detail.supervisor ? <p className="mt-1 text-xs text-soft">Supervisor: {detail.supervisor}</p> : null}
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${STATUS_META[detail.status]!.badgeClassName}`}> 
                          {STATUS_META[detail.status]!.label}
                        </span>
                      </div>

                      <div className="grid gap-2 text-sm text-slate-700 dark:text-white/75">
                        <p>Date: {formatDateLabel(detail.date)}</p>
                        <p>Check-In: {detail.checkinTime ?? "-"}</p>
                        <p>Check-Out: {detail.checkoutTime ?? "-"}</p>
                        <p>Working Hours: {detail.workingHours ?? "-"}</p>
                        <p>Attendance Status: {detail.attendanceStatus ?? "-"}</p>
                        <p>Leave Type: {detail.leaveType ?? "-"}</p>
                        <p>Leave Status: {detail.leaveStatus ?? "-"}</p>
                        <p>Approval Status: {detail.approvalStatus ?? "-"}</p>
                        <p>Approval Note: {detail.approvalNote ?? "-"}</p>
                        <p>Rejection Reason: {detail.rejectionReason ?? "-"}</p>
                        <p>Description: {detail.description ?? "-"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DashboardCard>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
