"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { type DateClickArg } from "@fullcalendar/interaction";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { EventClickArg, EventContentArg } from "@fullcalendar/core";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Phone,
  Pencil,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { Input } from "@/components/ui/Input";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { LeadForm } from "@/features/lead/components/LeadForm";
import type {
  FollowupCalendarResponse,
  FollowupFilter,
  FollowupItem,
  FollowupsByDateResponse,
} from "@/features/lead/types/followup.types";
import type { LeadFormValues } from "@/features/lead/data/lead.data";

const emptyCalendarData: FollowupCalendarResponse = {
  filter: "all",
  today: "",
  counts: {
    all: 0,
    today: 0,
    upcoming: 0,
    missed: 0,
    completed: 0,
  },
  items: [],
  events: [],
};

const emptyDateData: FollowupsByDateResponse = {
  date: "",
  label: "",
  count: 0,
  items: [],
};

const filterOptions: Array<{
  value: FollowupFilter;
  label: string;
  helper: string;
}> = [
  { value: "today", label: "Today's Followups", helper: "Due today" },
  { value: "all", label: "All Followups", helper: "Full calendar" },
  { value: "upcoming", label: "Upcoming", helper: "Future reminders" },
  { value: "missed", label: "Missed", helper: "Needs attention" },
  { value: "completed", label: "Completed", helper: "Closed items" },
];

export function FollowupsCalendarManagement() {
  const [activeFilter, setActiveFilter] = useState<FollowupFilter>("all");
  const [calendarData, setCalendarData] = useState<FollowupCalendarResponse>(emptyCalendarData);
  const [todayData, setTodayData] = useState<FollowupCalendarResponse>(emptyCalendarData);
  const [upcomingData, setUpcomingData] = useState<FollowupCalendarResponse>(emptyCalendarData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState<FollowupsByDateResponse>(emptyDateData);
  const [isDateDrawerOpen, setIsDateDrawerOpen] = useState(false);
  const [isDateDrawerLoading, setIsDateDrawerLoading] = useState(false);
  const [editingLead, setEditingLead] = useState<FollowupItem | null>(null);
  const [reschedulingLead, setReschedulingLead] = useState<FollowupItem | null>(null);
  const [rescheduleValue, setRescheduleValue] = useState("");
  const [submittingLeadId, setSubmittingLeadId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  useEffect(() => {
    void refreshCalendarData(activeFilter);
  }, [activeFilter]);

  async function refreshCalendarData(filter: FollowupFilter) {
    setLoading(true);
    setError("");

    try {
      const [calendarResponse, todayResponse, upcomingResponse] = await Promise.all([
        fetch(`/api/followups/calendar?filter=${filter}`, { cache: "no-store" }),
        fetch("/api/followups/today", { cache: "no-store" }),
        fetch("/api/followups/upcoming", { cache: "no-store" }),
      ]);

      const [calendarPayload, todayPayload, upcomingPayload] = (await Promise.all([
        calendarResponse.json(),
        todayResponse.json(),
        upcomingResponse.json(),
      ])) as Array<FollowupCalendarResponse & { message?: string }>;

      if (!calendarResponse.ok) {
        throw new Error(calendarPayload.message ?? "Unable to load followup calendar.");
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
      console.error("Failed to load followup calendar", fetchError);
      setError(
        fetchError instanceof Error ? fetchError.message : "Unable to load followup calendar.",
      );
      setCalendarData(emptyCalendarData);
      setTodayData(emptyCalendarData);
      setUpcomingData(emptyCalendarData);
    } finally {
      setLoading(false);
    }
  }

  async function openDateDrawer(dateKey: string) {
    setIsDateDrawerOpen(true);
    setIsDateDrawerLoading(true);
    setFeedbackMessage("");

    try {
      const response = await fetch(`/api/followups/date/${dateKey}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as FollowupsByDateResponse & { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to load followups for this date.");
      }

      setSelectedDate(payload);
    } catch (drawerError) {
      console.error("Failed to load followups by date", drawerError);
      setSelectedDate({
        date: dateKey,
        label: dateKey,
        count: 0,
        items: [],
      });
      setFeedbackMessage(
        drawerError instanceof Error
          ? drawerError.message
          : "Unable to load followups for this date.",
      );
    } finally {
      setIsDateDrawerLoading(false);
    }
  }

  function toFormValues(lead: FollowupItem): LeadFormValues {
    const followupDate = lead.nextFollowupAt
      ? new Date(lead.nextFollowupAt).toISOString().slice(0, 16)
      : "";

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
      assignedUser: lead.assignedUser,
      nextFollowupAt: followupDate,
    };
  }

  function buildLeadPayload(lead: FollowupItem, overrides?: Partial<LeadFormValues>): LeadFormValues {
    return {
      ...toFormValues(lead),
      ...overrides,
    };
  }

  async function saveLeadUpdate(lead: FollowupItem, overrides: Partial<LeadFormValues>, message: string) {
    setSubmittingLeadId(lead.id);
    setFeedbackMessage("");

    try {
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildLeadPayload(lead, overrides)),
      });

      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to update followup.");
      }

      setFeedbackMessage(message);
      await refreshCalendarData(activeFilter);

      if (isDateDrawerOpen && selectedDate.date) {
        await openDateDrawer(selectedDate.date);
      }
    } catch (updateError) {
      console.error("Failed to update followup", updateError);
      setFeedbackMessage(
        updateError instanceof Error ? updateError.message : "Unable to update followup.",
      );
    } finally {
      setSubmittingLeadId(null);
    }
  }

  async function markCompleted(lead: FollowupItem) {
    const shouldComplete = window.confirm(`Mark followup for ${lead.clientName} as completed?`);

    if (!shouldComplete) {
      return;
    }

    await saveLeadUpdate(lead, { leadStatus: "Closed" }, "Followup marked as completed.");
  }

  async function submitReschedule() {
    if (!reschedulingLead || !rescheduleValue) {
      return;
    }

    await saveLeadUpdate(
      reschedulingLead,
      {
        nextFollowupAt: rescheduleValue,
        leadStatus: reschedulingLead.status === "Closed" ? "Followup" : reschedulingLead.status,
      },
      "Followup rescheduled successfully.",
    );

    setReschedulingLead(null);
    setRescheduleValue("");
  }

  function openReschedule(lead: FollowupItem) {
    setReschedulingLead(lead);
    setRescheduleValue(lead.nextFollowupAt ? new Date(lead.nextFollowupAt).toISOString().slice(0, 16) : "");
    setFeedbackMessage("");
  }

  function handleEventClick(info: EventClickArg) {
    void openDateDrawer(info.event.startStr.slice(0, 10));
  }

  function handleDateClick(info: DateClickArg) {
    void openDateDrawer(info.dateStr.slice(0, 10));
  }

  function renderEventContent(eventInfo: EventContentArg) {
    const followup = eventInfo.event.extendedProps.followup as FollowupItem;

    return (
      <div className="flex flex-col gap-0.5 overflow-hidden rounded-lg px-1 py-0.5">
        <span className="truncate text-[11px] font-semibold">{followup.clientName}</span>
        <span className="truncate text-[10px] opacity-90">{followup.service}</span>
      </div>
    );
  }

  const summaryCards = [
    {
      label: "All Followups",
      value: calendarData.counts.all,
      icon: CalendarClock,
      tone: "from-sky-500/15 to-blue-500/5 text-sky-700",
    },
    {
      label: "Today",
      value: calendarData.counts.today,
      icon: Clock3,
      tone: "from-blue-500/15 to-cyan-500/5 text-blue-700",
    },
    {
      label: "Missed",
      value: calendarData.counts.missed,
      icon: AlertCircle,
      tone: "from-rose-500/15 to-orange-500/5 text-rose-700",
    },
    {
      label: "Completed",
      value: calendarData.counts.completed,
      icon: CheckCircle2,
      tone: "from-emerald-500/15 to-green-500/5 text-emerald-700",
    },
  ];

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Lead Management"
        title="Followup Calendar"
        description="A real CRM followup workspace driven by live lead followup dates, with calendar scheduling, date drawers, and quick action reminders."
        actions={
          <Button variant="secondary" onClick={() => void refreshCalendarData(activeFilter)}>
            <RefreshCw size={16} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <DashboardCard key={card.label} className="overflow-hidden">
              <div className={`rounded-2xl bg-linear-to-br p-4 ${card.tone}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{card.label}</p>
                    <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
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
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {filterOptions.map((option) => {
              const isActive = activeFilter === option.value;
              const count = calendarData.counts[option.value];

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
                      {count}
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <DashboardCard
          title="Calendar View"
          description="Month, week, and day views powered by live followup schedules from the leads database."
        >
          {loading ? (
            <div className="grid gap-4">
              <LoadingSkeleton className="h-14 w-full rounded-2xl" />
              <LoadingSkeleton className="hidden h-[620px] w-full rounded-[28px] md:block" />
              <div className="grid gap-3 md:hidden">
                {Array.from({ length: 4 }).map((_, index) => (
                  <LoadingSkeleton key={index} className="h-24 w-full rounded-2xl" />
                ))}
              </div>
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
              description="There are no live lead followups matching the selected filter."
            />
          ) : (
            <>
              <div className="hidden md:block">
                <div className="followup-calendar rounded-[28px] border border-[color:var(--border)] bg-white/85 p-3 shadow-sm">
                  <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    height="auto"
                    events={calendarData.events}
                    eventContent={renderEventContent}
                    eventClick={handleEventClick}
                    dateClick={handleDateClick}
                    dayMaxEventRows={3}
                    headerToolbar={{
                      left: "prev,next today",
                      center: "title",
                      right: "dayGridMonth,timeGridWeek,timeGridDay",
                    }}
                    buttonText={{
                      today: "Today",
                      month: "Month",
                      week: "Week",
                      day: "Day",
                    }}
                  />
                </div>
              </div>

              <div className="grid gap-3 md:hidden">
                {calendarData.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="rounded-[24px] border border-[color:var(--border)] bg-white/80 p-4 text-left shadow-sm transition hover:border-blue-500/25 hover:shadow-md"
                    onClick={() => void openDateDrawer(item.dateKey)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
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
          <DashboardCard
            title="Today's Followups"
            description="Quick cards for everything due today."
          >
            <div className="grid gap-3">
              {todayData.items.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-soft">
                  No followups scheduled for today.
                </p>
              ) : (
                todayData.items.slice(0, 5).map((item) => (
                  <QuickFollowupCard
                    key={item.id}
                    item={item}
                    onOpen={() => void openDateDrawer(item.dateKey)}
                  />
                ))
              )}
            </div>
          </DashboardCard>

          <DashboardCard
            title="Upcoming Reminders"
            description="Next followups in the queue for this admin."
          >
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
                    onClick={() => void openDateDrawer(item.dateKey)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.clientName}</p>
                        <p className="mt-1 text-xs text-soft">{item.service}</p>
                      </div>
                      <span className="text-xs font-semibold text-blue-600">
                        {item.followupDateLabel}
                      </span>
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
        onClose={() => {
          setIsDateDrawerOpen(false);
          setFeedbackMessage("");
        }}
        title={selectedDate.label || "Followups"}
        description="Review every followup scheduled on the selected date and take action without leaving the calendar."
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
            description="This date does not have any scheduled followup records for the current admin."
          />
        ) : (
          <div className="grid gap-4">
            {selectedDate.items.map((item) => (
              <div
                key={item.id}
                className="rounded-[26px] border border-[color:var(--border)] bg-white/90 p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{item.clientName}</p>
                    <p className="mt-1 text-sm text-soft">{item.service}</p>
                  </div>
                  <FollowupToneBadge item={item} />
                </div>

                <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50/80 p-4 text-sm text-slate-700">
                  <InfoRow label="Followup Time" value={item.followupDateTimeLabel} />
                  <InfoRow label="Mobile" value={item.mobile} />
                  <InfoRow label="Status" value={item.status} />
                  <InfoRow label="Assigned User" value={item.assignedUser || "Unassigned"} />
                  <InfoRow label="Remark" value={item.remark || "No remarks added"} />
                </div>

                <div className="mt-4 grid gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => void markCompleted(item)}
                      disabled={submittingLeadId === item.id || item.isCompleted}
                    >
                      <CheckCircle2 size={16} />
                      {item.isCompleted ? "Completed" : "Mark Completed"}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openReschedule(item)}
                      disabled={submittingLeadId === item.id}
                    >
                      <Clock3 size={16} />
                      Reschedule
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditingLead(item)}
                      disabled={submittingLeadId === item.id}
                    >
                      <Pencil size={16} />
                      Edit Lead
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <a
                      href={item.callLink}
                      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-[color:var(--border)] bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-blue-500/35 hover:bg-blue-50"
                    >
                      <Phone size={16} />
                      Call
                    </a>
                    <a
                      href={item.whatsappLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-500/15"
                    >
                      <UserRound size={16} />
                      WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </FormDrawer>

      <FormDrawer
        open={Boolean(editingLead)}
        onClose={() => setEditingLead(null)}
        title="Edit Lead"
        description="Update the lead record and keep the followup calendar in sync."
      >
        {editingLead ? (
          <LeadForm
            leadId={editingLead.id}
            initialValues={toFormValues(editingLead)}
            submitLabel="Update Lead"
            onCancel={() => setEditingLead(null)}
            onSuccess={async () => {
              await refreshCalendarData(activeFilter);
              if (isDateDrawerOpen && selectedDate.date) {
                await openDateDrawer(selectedDate.date);
              }
              setEditingLead(null);
            }}
          />
        ) : null}
      </FormDrawer>

      <FormDrawer
        open={Boolean(reschedulingLead)}
        onClose={() => {
          setReschedulingLead(null);
          setRescheduleValue("");
        }}
        title="Reschedule Followup"
        description="Move this followup to a new date and time while keeping the same lead record."
      >
        {reschedulingLead ? (
          <div className="grid gap-6">
            <div className="rounded-2xl border border-[color:var(--border)] bg-slate-50/80 p-4">
              <p className="text-base font-semibold text-slate-900">{reschedulingLead.clientName}</p>
              <p className="mt-1 text-sm text-soft">{reschedulingLead.service}</p>
            </div>

            <Input
              label="Next Followup"
              type="datetime-local"
              value={rescheduleValue}
              onChange={(event) => setRescheduleValue(event.target.value)}
            />

            <div className="flex flex-wrap justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setReschedulingLead(null);
                  setRescheduleValue("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={() => void submitReschedule()} disabled={!rescheduleValue}>
                Save Schedule
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

function QuickFollowupCard({
  item,
  onOpen,
}: {
  item: FollowupItem;
  onOpen: () => void;
}) {
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
    new: "bg-blue-50 text-blue-700",
    completed: "bg-emerald-50 text-emerald-700",
    upcoming: "bg-orange-50 text-orange-700",
    missed: "bg-rose-50 text-rose-700",
    qualified: "bg-violet-50 text-violet-700",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles[item.statusTone]}`}>
      {item.followupStatusLabel}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      <span className="max-w-[65%] text-right text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}
