"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { type DateClickArg } from "@fullcalendar/interaction";
import type { DatesSetArg, EventClickArg } from "@fullcalendar/core";
import { CalendarDays, Clock3, FileClock, Loader2, PlaneTakeoff, UserCheck, Users } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import type { AttendanceCalendarDay, AttendanceStats } from "@/features/attendance/types/attendance.types";
import type { DepartmentRow, OfficeLocationRow, UserAccessRow } from "@/features/admin/types/rbac.types";

type Props = {
  canViewAll: boolean;
};

type FilterPayload = {
  users: UserAccessRow[];
  departments: DepartmentRow[];
  officeLocations: OfficeLocationRow[];
};

const CARD_CONFIG = [
  { key: "presentToday", label: "Present Today", color: "text-emerald-600", bg: "bg-emerald-50", icon: UserCheck },
  { key: "absentToday", label: "Absent Today", color: "text-rose-600", bg: "bg-rose-50", icon: Users },
  { key: "onLeaveToday", label: "On Leave Today", color: "text-blue-600", bg: "bg-blue-50", icon: PlaneTakeoff },
  { key: "lateToday", label: "Late Today", color: "text-orange-600", bg: "bg-orange-50", icon: Clock3 },
  { key: "pendingLeaveRequests", label: "Pending Leave Requests", color: "text-violet-600", bg: "bg-violet-50", icon: FileClock },
  { key: "approvedLeavesThisMonth", label: "Approved Leaves This Month", color: "text-sky-600", bg: "bg-sky-50", icon: CalendarDays },
] as const;

const STATUS_LEGEND = [
  { label: "Present", color: "#16a34a" },
  { label: "Absent", color: "#dc2626" },
  { label: "Late", color: "#f97316" },
  { label: "Half Day", color: "#eab308" },
  { label: "Approved Leave", color: "#2563eb" },
  { label: "Pending Leave", color: "#6366f1" },
  { label: "Rejected Leave", color: "#6b7280" },
  { label: "Holiday", color: "#94a3b8" },
] as const;

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function AttendanceDashboard({ canViewAll }: Props) {
  const calendarRef = useRef<FullCalendar | null>(null);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [calendarDays, setCalendarDays] = useState<AttendanceCalendarDay[]>([]);
  const [filters, setFilters] = useState<FilterPayload>({ users: [], departments: [], officeLocations: [] });
  const [loading, setLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [query, setQuery] = useState({ userId: "", departmentId: "", officeLocationId: "", from: "", to: "" });

  useEffect(() => {
    void fetch("/api/attendance/stats", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => setStats(payload.stats ?? null))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!canViewAll) return;
    void fetch("/api/leaves/filters", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        setFilters({
          users: payload.users ?? [],
          departments: payload.departments ?? [],
          officeLocations: payload.officeLocations ?? [],
        });
      })
      .catch(() => null);
  }, [canViewAll]);

  const loadCalendar = useCallback(async (nextRange: { from: string; to: string }, active = query) => {
    setCalendarLoading(true);
    try {
      const params = new URLSearchParams({ from: active.from || nextRange.from, to: active.to || nextRange.to });
      if (active.userId) params.set("userId", active.userId);
      if (active.departmentId) params.set("departmentId", active.departmentId);
      if (active.officeLocationId) params.set("officeLocationId", active.officeLocationId);
      const response = await fetch(`/api/attendance/calendar?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Unable to load attendance calendar.");
      setCalendarDays(payload.days ?? []);
      setRange(payload.range ?? nextRange);
      setSelectedDate((current) => current && (payload.days ?? []).some((day: AttendanceCalendarDay) => day.date === current) ? current : payload.days?.[0]?.date ?? null);
    } catch (error) {
      console.error("Failed to load attendance calendar", error);
      setCalendarDays([]);
    } finally {
      setCalendarLoading(false);
    }
  }, [query]);

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    const visibleStart = arg.start;
    const visibleEnd = new Date(arg.end);
    visibleEnd.setDate(visibleEnd.getDate() - 1);
    const nextRange = { from: isoDate(visibleStart), to: isoDate(visibleEnd) };
    void loadCalendar(nextRange);
  }, [loadCalendar]);

  const events = useMemo(() => calendarDays.flatMap((day) =>
    day.summaries.map((summary) => ({
      id: `${day.date}-${summary.status}`,
      title: summary.count > 1 ? `${summary.count} ${summary.status}` : summary.status,
      start: day.date,
      allDay: true,
      backgroundColor: summary.color,
      borderColor: summary.color,
      textColor: "#ffffff",
    })),
  ), [calendarDays]);

  const selectedDay = useMemo(
    () => calendarDays.find((day) => day.date === selectedDate) ?? null,
    [calendarDays, selectedDate],
  );

  const statCards = stats
    ? CARD_CONFIG.map((card) => ({ ...card, value: stats[card.key] }))
    : [];

  function handleApplyFilters() {
    const nextRange = {
      from: query.from || range?.from || isoDate(new Date()),
      to: query.to || range?.to || query.from || isoDate(new Date()),
    };

    if (nextRange.from && calendarRef.current) {
      calendarRef.current.getApi().gotoDate(nextRange.from);
    }

    void loadCalendar(nextRange, query);
  }

  function selectCalendarDate(date: string) {
    setSelectedDate(date);
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

      <DashboardCard title="Monthly Attendance Calendar" description="Click a date to inspect attendance, leave, and absence details.">
        {canViewAll ? (
          <div className="mb-5 grid gap-3 md:grid-cols-6">
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
              <span>From</span>
              <input type="date" className="h-12 rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 text-sm dark:bg-white/5" value={query.from} onChange={(event) => setQuery((current) => ({ ...current, from: event.target.value }))} />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              <span>To</span>
              <input type="date" className="h-12 rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 text-sm dark:bg-white/5" value={query.to} onChange={(event) => setQuery((current) => ({ ...current, to: event.target.value }))} />
            </label>
            <div className="flex items-end">
              <Button type="button" className="w-full" onClick={handleApplyFilters}>Apply Filters</Button>
            </div>
          </div>
        ) : null}

        <div className="mb-5 flex flex-wrap gap-3 rounded-2xl border border-[color:var(--border)] bg-slate-50/80 p-4 dark:bg-white/5">
          {STATUS_LEGEND.map((item) => (
            <div key={item.label} className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-white/70">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div className="min-w-0 overflow-hidden rounded-2xl border border-[color:var(--border)] bg-white/80 p-3 dark:bg-white/5">
            {calendarLoading ? (
              <div className="flex h-[680px] items-center justify-center text-sm text-soft">
                <Loader2 className="mr-2 animate-spin" size={18} /> Loading calendar...
              </div>
            ) : (
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
                events={events}
                height={680}
                datesSet={handleDatesSet}
                dateClick={(arg: DateClickArg) => selectCalendarDate(arg.dateStr)}
                eventClick={(arg: EventClickArg) => selectCalendarDate(arg.event.startStr)}
                dayMaxEventRows={4}
              />
            )}
          </div>

          <div className="grid gap-4">
            <DashboardCard title={selectedDay ? `Attendance Details - ${selectedDay.date}` : "Attendance Details"} description="Date-wise attendance and leave summary.">
              {!selectedDay ? (
                <p className="text-sm text-soft">Select a day from the calendar.</p>
              ) : selectedDay.details.length === 0 ? (
                <p className="text-sm text-soft">No records found for this date.</p>
              ) : (
                <div className="grid gap-3">
                  {selectedDay.details.map((detail) => (
                    <div key={`${detail.userId}-${detail.date}`} className="rounded-2xl border border-[color:var(--border)] bg-white/80 p-4 dark:bg-white/5">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{detail.userName}</p>
                          <p className="text-xs text-soft">{detail.department} - {detail.officeLocation}</p>
                        </div>
                        <span className="rounded-full px-3 py-1 text-xs font-bold text-white" style={{ backgroundColor: selectedDay.summaries.find((item) => item.status === detail.status)?.color ?? '#64748b' }}>
                          {detail.status}
                        </span>
                      </div>
                      <div className="grid gap-2 text-sm text-slate-700 dark:text-white/75">
                        <p>Date: {detail.date}</p>
                        <p>Status: {detail.status}</p>
                        <p>Check-In: {detail.checkinTime ?? "-"}</p>
                        <p>Check-Out: {detail.checkoutTime ?? "-"}</p>
                        <p>Working Hours: {detail.workingHours ?? "-"}</p>
                        {detail.leaveType ? <p>Leave Type: {detail.leaveType}</p> : null}
                        {detail.leaveReason ? <p>Leave Details: {detail.leaveReason}</p> : null}
                        {detail.approvalNote ? <p>Approval Note: {detail.approvalNote}</p> : null}
                        {detail.rejectionReason ? <p>Rejection Reason: {detail.rejectionReason}</p> : null}
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
