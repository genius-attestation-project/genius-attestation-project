"use client";

import type { EventClickArg, EventContentArg } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { type DateClickArg } from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import {
  AlertCircle,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Clock3,
  History,
  Pencil,
  Phone,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Textarea } from "@/components/ui/Textarea";
import { FollowupDateTimePicker } from "@/features/lead/components/FollowupDateTimePicker";
import { LeadForm } from "@/features/lead/components/LeadForm";
import type { LeadFormValues } from "@/features/lead/data/lead.data";
import type {
  FollowupCalendarResponse,
  FollowupFilter,
  FollowupHistoryResponse,
  FollowupItem,
  FollowupsByDateResponse,
} from "@/features/lead/types/followup.types";

const emptyCalendarData: FollowupCalendarResponse = {
  filter: "all",
  today: "",
  counts: { all: 0, today: 0, upcoming: 0, missed: 0, completed: 0 },
  items: [],
  events: [],
};

const emptyDateData: FollowupsByDateResponse = {
  date: "",
  label: "",
  count: 0,
  items: [],
};

const filterOptions: Array<{ value: FollowupFilter; label: string; helper: string }> = [
  { value: "today", label: "Today's Followups", helper: "Due today" },
  { value: "all", label: "All Followups", helper: "Full calendar" },
  { value: "upcoming", label: "Upcoming", helper: "Future reminders" },
  { value: "missed", label: "Overdue", helper: "Needs action" },
  { value: "completed", label: "Completed", helper: "Closed followups" },
];

function toLocalDateTimeInput(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function FollowupsCalendarManagement() {
  const [activeFilter, setActiveFilter] = useState<FollowupFilter>("all");
  const [calendarData, setCalendarData] = useState<FollowupCalendarResponse>(emptyCalendarData);
  const [todayData, setTodayData] = useState<FollowupCalendarResponse>(emptyCalendarData);
  const [upcomingData, setUpcomingData] = useState<FollowupCalendarResponse>(emptyCalendarData);
  const [selectedDate, setSelectedDate] = useState<FollowupsByDateResponse>(emptyDateData);
  const [selectedFollowup, setSelectedFollowup] = useState<FollowupItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isDateDrawerOpen, setIsDateDrawerOpen] = useState(false);
  const [isDateDrawerLoading, setIsDateDrawerLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [editingLead, setEditingLead] = useState<FollowupItem | null>(null);
  const [snoozingLead, setSnoozingLead] = useState<FollowupItem | null>(null);
  const [snoozeValue, setSnoozeValue] = useState("");
  const [completionLead, setCompletionLead] = useState<FollowupItem | null>(null);
  const [completionDescription, setCompletionDescription] = useState("");
  const [submittingLeadId, setSubmittingLeadId] = useState<string | null>(null);
  const [notificationItem, setNotificationItem] = useState<FollowupItem | null>(null);
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    void refreshCalendarData(activeFilter);
  }, [activeFilter]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const timer = window.setInterval(() => {
      const now = Date.now();
      const dueItem = todayData.items.find((item) => {
        if (item.isCompleted || notifiedIdsRef.current.has(item.id)) {
          return false;
        }

        const diff = Math.abs(new Date(item.followupDate).getTime() - now);
        return diff <= 60_000;
      });

      if (!dueItem) {
        return;
      }

      notifiedIdsRef.current.add(dueItem.id);
      setNotificationItem(dueItem);

      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Followup reminder", {
          body: `${dueItem.clientName} - ${dueItem.mobile} - ${dueItem.followupTimeLabel}`,
        });
      }
    }, 30_000);

    return () => window.clearInterval(timer);
  }, [todayData]);

  async function refreshCalendarData(filter: FollowupFilter) {
    setLoading(true);
    setError("");

    try {
      const [calendarResponse, todayResponse, upcomingResponse] = await Promise.all([
        fetch(`/api/followups?filter=${filter}`, { cache: "no-store" }),
        fetch("/api/followups/today", { cache: "no-store" }),
        fetch("/api/followups/upcoming", { cache: "no-store" }),
      ]);

      const [calendarPayload, todayPayload, upcomingPayload] = (await Promise.all([
        calendarResponse.json(),
        todayResponse.json(),
        upcomingResponse.json(),
      ])) as Array<FollowupCalendarResponse & { message?: string }>;

      if (!calendarResponse.ok) {
        throw new Error(calendarPayload.message ?? "Unable to load followups.");
      }

      if (!todayResponse.ok) {
        throw new Error(todayPayload.message ?? "Unable to load today's followups.");
      }

      if (!upcomingResponse.ok) {
        throw new Error(upcomingPayload.message ?? "Unable to load upcoming followups.");
      }

      setCalendarData(calendarPayload);
      setTodayData(todayPayload);
      setUpcomingData(upcomingPayload);
    } catch (fetchError) {
      console.error("Failed to load followups", fetchError);
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load followups.");
      setCalendarData(emptyCalendarData);
      setTodayData(emptyCalendarData);
      setUpcomingData(emptyCalendarData);
    } finally {
      setLoading(false);
    }
  }

  async function refreshDateDrawer(dateKey: string) {
    setIsDateDrawerLoading(true);

    try {
      const response = await fetch(`/api/followups/date/${dateKey}`, { cache: "no-store" });
      const payload = (await response.json()) as FollowupsByDateResponse & { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to load followups for this date.");
      }

      setSelectedDate(payload);
    } catch (drawerError) {
      console.error("Failed to load followups by date", drawerError);
      setFeedbackMessage(
        drawerError instanceof Error ? drawerError.message : "Unable to load followups for this date.",
      );
      setSelectedDate(emptyDateData);
    } finally {
      setIsDateDrawerLoading(false);
    }
  }

  async function openDateDrawer(dateKey: string) {
    setIsDateDrawerOpen(true);
    setFeedbackMessage("");
    await refreshDateDrawer(dateKey);
  }

  async function openFollowupDetails(item: FollowupItem) {
    setSelectedFollowup(item);
    setIsHistoryLoading(true);
    setFeedbackMessage("");

    try {
      const response = await fetch(`/api/followups/history/${item.id}`, { cache: "no-store" });
      const payload = (await response.json()) as FollowupHistoryResponse & { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to load followup history.");
      }

      setSelectedFollowup({
        ...item,
        history: payload.items,
      });
    } catch (historyError) {
      console.error("Failed to load followup history", historyError);
      setFeedbackMessage(
        historyError instanceof Error ? historyError.message : "Unable to load followup history.",
      );
    } finally {
      setIsHistoryLoading(false);
    }
  }

  function toFormValues(lead: FollowupItem): LeadFormValues {
    return {
      firstName: lead.firstName,
      lastName: lead.lastName,
      countryCode: lead.countryCode,
      mobileNumber: lead.mobileNumber,
      email: lead.email,
      docType: lead.docType,
      noOfDocuments: lead.noOfDocuments,
      country: lead.country,
      state: lead.state,
      documentIssuedCountry: lead.documentIssuedCountry,
      service: lead.service,
      source: lead.source,
      leadStatus: lead.status,
      clientType: lead.clientType,
      amount: lead.rawAmount ? String(lead.rawAmount) : "",
      workingDays: lead.workingDays,
      remark: lead.remark,
      assignedUserId: lead.assignedUserId,
      assignedUser: lead.assignedUser,
      nextFollowupAt: toLocalDateTimeInput(lead.nextFollowupAt),
    };
  }

  async function syncAfterMutation(leadId?: string, dateKey?: string) {
    await refreshCalendarData(activeFilter);

    if (isDateDrawerOpen && (dateKey || selectedDate.date)) {
      await refreshDateDrawer(dateKey || selectedDate.date);
    }

    if (leadId) {
      const nextSelected =
        calendarData.items.find((item) => item.id === leadId) ||
        todayData.items.find((item) => item.id === leadId) ||
        upcomingData.items.find((item) => item.id === leadId) ||
        selectedDate.items.find((item) => item.id === leadId) ||
        null;

      if (nextSelected) {
        await openFollowupDetails(nextSelected);
      }
    }
  }

  async function submitSnooze() {
    if (!snoozingLead || !snoozeValue) {
      return;
    }

    setSubmittingLeadId(snoozingLead.id);
    setFeedbackMessage("");

    try {
      const response = await fetch("/api/followups/snooze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: snoozingLead.id,
          nextFollowupAt: snoozeValue,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to snooze followup.");
      }

      setFeedbackMessage(payload?.message ?? "Followup snoozed successfully.");
      await syncAfterMutation(snoozingLead.id, snoozingLead.dateKey);
      setSnoozingLead(null);
      setSnoozeValue("");
    } catch (submitError) {
      console.error("Failed to snooze followup", submitError);
      setFeedbackMessage(
        submitError instanceof Error ? submitError.message : "Unable to snooze followup.",
      );
    } finally {
      setSubmittingLeadId(null);
    }
  }

  async function submitCompletion() {
    if (!completionLead || !completionDescription.trim()) {
      return;
    }

    setSubmittingLeadId(completionLead.id);
    setFeedbackMessage("");

    try {
      const response = await fetch("/api/followups/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: completionLead.id,
          completionDescription,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to complete followup.");
      }

      setFeedbackMessage(payload?.message ?? "Followup marked as completed.");
      await syncAfterMutation(completionLead.id, completionLead.dateKey);
      setCompletionLead(null);
      setCompletionDescription("");
    } catch (submitError) {
      console.error("Failed to complete followup", submitError);
      setFeedbackMessage(
        submitError instanceof Error ? submitError.message : "Unable to complete followup.",
      );
    } finally {
      setSubmittingLeadId(null);
    }
  }

  function handleEventClick(info: EventClickArg) {
    const followup = info.event.extendedProps.followup as FollowupItem;
    void openFollowupDetails(followup);
  }

  function handleDateClick(info: DateClickArg) {
    void openDateDrawer(info.dateStr.slice(0, 10));
  }

  function renderEventContent(eventInfo: EventContentArg) {
    const followup = eventInfo.event.extendedProps.followup as FollowupItem;

    return (
      <div className="flex flex-col gap-0.5 overflow-hidden rounded-xl px-2 py-1">
        <span className="truncate text-[11px] font-semibold">{followup.clientName}</span>
        <span className="truncate text-[10px] opacity-90">{followup.followupTimeLabel}</span>
      </div>
    );
  }

  const summaryCards = [
    { label: "All Followups", value: calendarData.counts.all, icon: CalendarClock, tone: "from-sky-500/15 to-blue-500/5 text-sky-700" },
    { label: "Today", value: calendarData.counts.today, icon: Clock3, tone: "from-blue-500/15 to-cyan-500/5 text-blue-700" },
    { label: "Overdue", value: calendarData.counts.missed, icon: AlertCircle, tone: "from-rose-500/15 to-orange-500/5 text-rose-700" },
    { label: "Completed", value: calendarData.counts.completed, icon: CheckCircle2, tone: "from-emerald-500/15 to-green-500/5 text-emerald-700" },
  ];

  return (
    <div className="grid min-w-0 gap-4 sm:gap-6">
      <PageHeader
        eyebrow="Lead Management"
        title="Followups"
        description="Modern CRM scheduling for live lead followups with reminders, snooze controls, completion notes, and timeline history."
        actions={
          <Button variant="secondary" onClick={() => void refreshCalendarData(activeFilter)}>
            <RefreshCw size={16} />
            Refresh
          </Button>
        }
      />

      {notificationItem ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-blue-200 bg-linear-to-r from-blue-50 to-cyan-50 px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <BellRing size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">Followup reminder</p>
              <p className="text-sm text-slate-600">
                {notificationItem.clientName} - {notificationItem.mobile} - {notificationItem.followupTimeLabel}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => void openFollowupDetails(notificationItem)}>
              Open
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setNotificationItem(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <DashboardCard key={card.label} className="overflow-hidden">
              <div className={`rounded-2xl bg-linear-to-br p-4 ${card.tone}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{card.label}</p>
                    <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                      {card.value}
                    </p>
                  </div>
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/75 text-slate-900 shadow-sm">
                    <Icon size={20} />
                  </span>
                </div>
              </div>
            </DashboardCard>
          );
        })}
      </div>

      <DashboardCard>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-5">
            {filterOptions.map((option) => {
              const isActive = activeFilter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    isActive
                      ? "border-blue-500/35 bg-blue-50 text-blue-700 shadow-sm"
                      : "border-[color:var(--border)] bg-white/70 text-[color:var(--text)] hover:border-blue-500/25 hover:bg-blue-50/60"
                  }`}
                  onClick={() => setActiveFilter(option.value)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold">{option.label}</span>
                    <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm">
                      {calendarData.counts[option.value]}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-soft">{option.helper}</p>
                </button>
              );
            })}
          </div>
          <p className="text-sm text-soft">
            Showing {calendarData.items.length} followups for the {activeFilter} queue.
          </p>
        </div>
      </DashboardCard>

      <div className="grid min-w-0 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <DashboardCard
          title="Calendar View"
          description="Month, week, and day scheduling powered by real followup timestamps."
        >
          {loading ? (
            <div className="grid gap-4">
              <LoadingSkeleton className="h-14 w-full rounded-2xl" />
              <LoadingSkeleton className="hidden h-[620px] w-full rounded-[28px] md:block" />
            </div>
          ) : error ? (
            <EmptyState
              icon={AlertCircle}
              title="Unable to load followups"
              description={error}
              action={<Button onClick={() => void refreshCalendarData(activeFilter)}>Retry</Button>}
            />
          ) : calendarData.items.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="No followups in this queue"
              description="There are no followups matching the selected filter."
            />
          ) : (
            <>
              <div className="hidden md:block">
                <div className="followup-calendar min-w-0 overflow-x-auto rounded-2xl border border-[color:var(--border)] bg-white/85 p-3 shadow-sm sm:rounded-[28px]">
                  <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    height="auto"
                    events={calendarData.events}
                    eventContent={renderEventContent}
                    eventClick={handleEventClick}
                    dateClick={handleDateClick}
                    dayMaxEventRows={3}
                    nowIndicator
                    eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
                    headerToolbar={{
                      left: "prev,next today",
                      center: "title",
                      right: "dayGridMonth,timeGridWeek,timeGridDay",
                    }}
                    buttonText={{ today: "Today", month: "Month", week: "Week", day: "Day" }}
                  />
                </div>
              </div>

              <div className="grid gap-3 md:hidden">
                {calendarData.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="rounded-[24px] border border-[color:var(--border)] bg-white/80 p-4 text-left shadow-sm transition hover:border-blue-500/25 hover:shadow-md"
                    onClick={() => void openFollowupDetails(item)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{item.clientName}</p>
                        <p className="mt-1 text-sm text-soft">{item.service}</p>
                      </div>
                      <FollowupToneBadge item={item} />
                    </div>
                    <div className="mt-4 grid gap-2 text-sm text-soft">
                      <p>{item.followupDateTimeLabel}</p>
                      <p>{item.assignedUser || "Unassigned"}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </DashboardCard>

        <div className="grid gap-6 self-start xl:sticky xl:top-6">
          <DashboardCard title="Today's Followups" description="Everything due today for this admin.">
            <div className="grid gap-3">
              {todayData.items.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-soft">
                  No followups scheduled for today.
                </p>
              ) : (
                todayData.items.slice(0, 5).map((item) => (
                  <QuickFollowupCard key={item.id} item={item} onOpen={() => void openFollowupDetails(item)} />
                ))
              )}
            </div>
          </DashboardCard>

          <DashboardCard title="Upcoming Reminders" description="Upcoming followups in time order.">
            <div className="grid gap-3">
              {upcomingData.items.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-soft">
                  No upcoming reminders right now.
                </p>
              ) : (
                upcomingData.items.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 py-3 text-left transition hover:border-blue-500/25"
                    onClick={() => void openFollowupDetails(item)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.clientName}</p>
                        <p className="mt-1 text-xs text-soft">{item.service}</p>
                      </div>
                      <span className="text-xs font-semibold text-blue-600">{item.followupTimeLabel}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </DashboardCard>
        </div>
      </div>

      <FormDrawer
        open={isDateDrawerOpen}
        onClose={() => setIsDateDrawerOpen(false)}
        title={selectedDate.label || "Followups"}
        description="Browse all followups scheduled for the selected date."
      >
        {feedbackMessage ? (
          <p className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            {feedbackMessage}
          </p>
        ) : null}

        {isDateDrawerLoading ? (
          <div className="grid gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <LoadingSkeleton key={index} className="h-44 w-full rounded-2xl" />
            ))}
          </div>
        ) : selectedDate.items.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No followups on this date"
            description="This date does not have any followup records for the current admin."
          />
        ) : (
          <div className="grid gap-4">
            {selectedDate.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="rounded-[26px] border border-[color:var(--border)] bg-white/90 p-5 text-left shadow-sm transition hover:border-blue-500/25"
                onClick={() => void openFollowupDetails(item)}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-slate-900">{item.clientName}</p>
                    <p className="mt-1 text-sm text-soft">{item.service}</p>
                  </div>
                  <FollowupToneBadge item={item} />
                </div>
                <div className="mt-4 grid gap-2 text-sm text-slate-600">
                  <p>{item.followupDateTimeLabel}</p>
                  <p>{item.mobile}</p>
                  <p>{item.assignedUser || "Unassigned"}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </FormDrawer>

      <FormDrawer
        open={Boolean(selectedFollowup)}
        onClose={() => setSelectedFollowup(null)}
        title={selectedFollowup ? `${selectedFollowup.clientName} Followup` : "Followup Details"}
        description="Lead details, status, completion notes, and followup timeline."
      >
        {selectedFollowup ? (
          <div className="grid gap-5">
            {feedbackMessage ? (
              <p className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                {feedbackMessage}
              </p>
            ) : null}

            <div className="rounded-[26px] border border-[color:var(--border)] bg-white/90 p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xl font-semibold text-slate-900">{selectedFollowup.clientName}</p>
                  <p className="mt-1 text-sm text-soft">{selectedFollowup.service}</p>
                </div>
                <FollowupToneBadge item={selectedFollowup} />
              </div>

              <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50/80 p-4 text-sm text-slate-700">
                <InfoRow label="Lead Name" value={selectedFollowup.clientName} />
                <InfoRow label="Client Name" value={selectedFollowup.clientName} />
                <InfoRow label="Mobile" value={selectedFollowup.mobile} />
                <InfoRow label="Current Followup" value={selectedFollowup.followupDateTimeLabel} />
                <InfoRow label="Status" value={selectedFollowup.followupStatusLabel} />
                <InfoRow label="Assigned User" value={selectedFollowup.assignedUser || "Unassigned"} />
                <InfoRow label="Remark" value={selectedFollowup.remark || "No remarks added"} />
                <InfoRow
                  label="Completion Note"
                  value={selectedFollowup.completionDescription || "Not completed yet"}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={submittingLeadId === selectedFollowup.id || selectedFollowup.isCompleted}
                  onClick={() => {
                    setCompletionLead(selectedFollowup);
                    setCompletionDescription(selectedFollowup.completionDescription || "");
                  }}
                >
                  <CheckCircle2 size={16} />
                  {selectedFollowup.isCompleted ? "Completed" : "Mark As Completed"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={submittingLeadId === selectedFollowup.id}
                  onClick={() => {
                    setSnoozingLead(selectedFollowup);
                    setSnoozeValue(toLocalDateTimeInput(selectedFollowup.nextFollowupAt));
                  }}
                >
                  <Clock3 size={16} />
                  Snooze
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditingLead(selectedFollowup)}
                >
                  <Pencil size={16} />
                  Edit Lead
                </Button>
                <a
                  href={selectedFollowup.callLink}
                  className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-[color:var(--border)] bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-blue-500/35 hover:bg-blue-50"
                >
                  <Phone size={16} />
                  Call
                </a>
                <a
                  href={selectedFollowup.whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-500/15"
                >
                  <UserRound size={16} />
                  WhatsApp
                </a>
              </div>
            </div>

            <div className="rounded-[26px] border border-[color:var(--border)] bg-white/90 p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <History size={16} className="text-blue-600" />
                <p className="text-sm font-semibold text-slate-900">Followup History</p>
              </div>

              {isHistoryLoading ? (
                <div className="grid gap-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <LoadingSkeleton key={index} className="h-20 w-full rounded-2xl" />
                  ))}
                </div>
              ) : selectedFollowup.history.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-soft">
                  No followup history yet.
                </p>
              ) : (
                <div className="grid gap-3">
                  {selectedFollowup.history.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-slate-100 bg-slate-50/90 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{entry.actionType}</p>
                        <p className="text-xs font-medium text-slate-500">{entry.createdAtLabel}</p>
                      </div>
                      <div className="mt-2 grid gap-1 text-sm text-slate-600">
                        {entry.oldDateLabel ? <p>From: {entry.oldDateLabel}</p> : null}
                        {entry.newDateLabel ? <p>To: {entry.newDateLabel}</p> : null}
                        <p>{entry.description || "No description provided."}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </FormDrawer>

      <FormDrawer
        open={Boolean(editingLead)}
        onClose={() => setEditingLead(null)}
        title="Edit Lead"
        description="Update the lead record and keep the followup workspace in sync."
      >
        {editingLead ? (
          <LeadForm
            leadId={editingLead.id}
            initialValues={toFormValues(editingLead)}
            submitLabel="Update Lead"
            onCancel={() => setEditingLead(null)}
            onSuccess={async () => {
              await syncAfterMutation(editingLead.id, editingLead.dateKey);
              setEditingLead(null);
            }}
          />
        ) : null}
      </FormDrawer>

      <FormDrawer
        open={Boolean(snoozingLead)}
        onClose={() => {
          setSnoozingLead(null);
          setSnoozeValue("");
        }}
        title="Snooze Followup"
        description="Move this followup to another date and time using the same mini calendar scheduler."
      >
        {snoozingLead ? (
          <div className="grid gap-6">
            <div className="rounded-[26px] border border-[color:var(--border)] bg-white/90 p-5 shadow-sm">
              <p className="text-base font-semibold text-slate-900">{snoozingLead.clientName}</p>
              <p className="mt-1 text-sm text-soft">Current: {snoozingLead.followupDateTimeLabel}</p>
            </div>

            <FollowupDateTimePicker
              label="Snooze To"
              value={snoozeValue}
              onChange={setSnoozeValue}
              description="Pick the next followup slot."
              required
            />

            <div className="flex flex-wrap justify-end gap-3">
              <Button variant="ghost" onClick={() => setSnoozingLead(null)}>
                Cancel
              </Button>
              <Button onClick={() => void submitSnooze()} disabled={!snoozeValue || submittingLeadId === snoozingLead.id}>
                Save Snooze
              </Button>
            </div>
          </div>
        ) : null}
      </FormDrawer>

      <FormDrawer
        open={Boolean(completionLead)}
        onClose={() => {
          setCompletionLead(null);
          setCompletionDescription("");
        }}
        title="Mark Followup As Completed"
        description="Completion notes are required before the followup can be closed."
        placement="center"
      >
        {completionLead ? (
          <div className="grid gap-5">
            <div className="rounded-2xl border border-[color:var(--border)] bg-slate-50/90 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{completionLead.clientName}</p>
              <p className="mt-1">{completionLead.followupDateTimeLabel}</p>
            </div>

            <Textarea
              label="Completion Description"
              value={completionDescription}
              onChange={(event) => setCompletionDescription(event.target.value)}
              placeholder="Customer confirmed documents submitted."
            />

            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setCompletionLead(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => void submitCompletion()}
                disabled={!completionDescription.trim() || submittingLeadId === completionLead.id}
              >
                Complete Followup
              </Button>
            </div>
          </div>
        ) : null}
      </FormDrawer>

      <style jsx global>{`
        .followup-calendar .fc {
          --fc-border-color: rgba(148, 163, 184, 0.18);
          --fc-button-bg-color: #eff6ff;
          --fc-button-border-color: transparent;
          --fc-button-text-color: #1d4ed8;
          --fc-button-hover-bg-color: #dbeafe;
          --fc-button-hover-border-color: transparent;
          --fc-button-active-bg-color: #2563eb;
          --fc-button-active-border-color: #2563eb;
          --fc-button-active-text-color: #ffffff;
          --fc-today-bg-color: rgba(59, 130, 246, 0.08);
        }

        .followup-calendar .fc-toolbar {
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }

        .followup-calendar .fc-toolbar-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #0f172a;
        }

        .followup-calendar .fc-button {
          border-radius: 14px;
          box-shadow: none;
          font-weight: 600;
          text-transform: none;
        }

        .followup-calendar .fc-daygrid-day-frame,
        .followup-calendar .fc-timegrid-slot-label-frame,
        .followup-calendar .fc-timegrid-axis-frame {
          padding: 4px;
        }

        .followup-calendar .fc-col-header-cell-cushion,
        .followup-calendar .fc-daygrid-day-number {
          color: #475569;
          font-weight: 600;
          text-decoration: none;
        }

        .followup-calendar .fc-event {
          border-radius: 12px;
          padding: 2px;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
        }

        .followup-calendar .fc-daygrid-day.fc-day-today {
          border-radius: 18px;
        }
      `}</style>
    </div>
  );
}

function QuickFollowupCard({ item, onOpen }: { item: FollowupItem; onOpen: () => void }) {
  return (
    <button
      type="button"
      className="rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 py-3 text-left transition hover:border-blue-500/25"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{item.clientName}</p>
          <p className="mt-1 text-xs text-soft">{item.service}</p>
        </div>
        <FollowupToneBadge item={item} />
      </div>
      <p className="mt-3 text-xs font-medium text-blue-600">{item.followupTimeLabel}</p>
    </button>
  );
}

function FollowupToneBadge({ item }: { item: FollowupItem }) {
  const styles: Record<FollowupItem["statusTone"], string> = {
    pending: "bg-blue-50 text-blue-700",
    completed: "bg-emerald-50 text-emerald-700",
    rescheduled: "bg-orange-50 text-orange-700",
    missed: "bg-rose-50 text-rose-700",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[item.statusTone]}`}>
      {item.followupStatusLabel}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      <span className="max-w-full break-words text-left text-sm font-medium text-slate-900 sm:max-w-[65%] sm:text-right">
        {value}
      </span>
    </div>
  );
}
