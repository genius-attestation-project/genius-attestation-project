"use client";

import { CheckCircle2, Clock3, MessageCircle, PhoneCall, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";

type FollowupReminder = {
  leadId: string;
  leadName: string;
  mobile: string;
  whatsappNumber: string;
  followupType: string;
  followupNote: string;
  nextFollowupAt: string;
};

type FollowupReminderProviderProps = {
  userId: string;
  ownerAdminId: string;
};

const hourOptions = Array.from({ length: 12 }, (_, index) => String(index + 1));
const minuteOptions = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

function formatReminderDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function toDateInputValue(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toTimeParts(value: string) {
  const date = new Date(value);
  const source = Number.isNaN(date.getTime()) ? new Date() : date;
  const hours = source.getHours();
  const hour12 = hours % 12 || 12;

  return {
    hour: String(hour12),
    minute: String(source.getMinutes()).padStart(2, "0"),
    period: hours >= 12 ? "PM" : "AM",
  };
}

function buildSelectedDateTime(dateValue: string, hourValue: string, minuteValue: string, period: string) {
  if (!dateValue) {
    return null;
  }

  const [year, month, day] = dateValue.split("-").map((part) => Number.parseInt(part, 10));
  const hourNumber = Number.parseInt(hourValue, 10);
  const minuteNumber = Number.parseInt(minuteValue, 10);

  if (!year || !month || !day || !hourNumber || Number.isNaN(minuteNumber)) {
    return null;
  }

  const normalizedHour =
    period === "PM" ? (hourNumber === 12 ? 12 : hourNumber + 12) : hourNumber === 12 ? 0 : hourNumber;
  const selected = new Date(year, month - 1, day, normalizedHour, minuteNumber, 0, 0);

  return Number.isNaN(selected.getTime()) ? null : selected;
}

export function FollowupReminderProvider({
  userId,
  ownerAdminId,
}: FollowupReminderProviderProps) {
  const router = useRouter();
  const [reminders, setReminders] = useState<FollowupReminder[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [snoozeNote, setSnoozeNote] = useState("");
  const [snoozeDate, setSnoozeDate] = useState("");
  const [snoozeHour, setSnoozeHour] = useState("1");
  const [snoozeMinute, setSnoozeMinute] = useState("00");
  const [snoozePeriod, setSnoozePeriod] = useState("AM");
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completionNote, setCompletionNote] = useState("");
  const activeReminder = reminders[0];

  const reminderSubtitle = useMemo(() => {
    if (!activeReminder) {
      return "";
    }

    return `${activeReminder.followupType || "Call"} - ${formatReminderDate(activeReminder.nextFollowupAt)}`;
  }, [activeReminder]);

  useEffect(() => {
    if (!userId || !ownerAdminId) {
      return;
    }

    async function loadDueFollowups() {
      try {
        const response = await fetch("/api/followups/due", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as
          | { reminders?: FollowupReminder[] }
          | null;
        const dueReminders = payload?.reminders ?? [];

        if (response.ok && dueReminders.length) {
          setReminders((current) => {
            const existingIds = new Set(current.map((item) => item.leadId));
            return [
              ...current,
              ...dueReminders.filter((item) => !existingIds.has(item.leadId)),
            ];
          });
        }
      } catch (error) {
        console.error("Unable to load due followups", error);
      }
    }

    void loadDueFollowups();
    const interval = window.setInterval(() => void loadDueFollowups(), 30_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [ownerAdminId, userId]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setToastMessage(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  function closeActiveReminder() {
    setSnoozeOpen(false);
    setCompleteOpen(false);
    setReminders((current) => current.slice(1));
  }

  function openSnoozeModal() {
    if (!activeReminder) {
      return;
    }

    const timeParts = toTimeParts(activeReminder.nextFollowupAt);
    setSnoozeNote("");
    setSnoozeDate(toDateInputValue(activeReminder.nextFollowupAt));
    setSnoozeHour(timeParts.hour);
    setSnoozeMinute(timeParts.minute);
    setSnoozePeriod(timeParts.period);
    setSnoozeOpen(true);
  }

  function openCompleteModal() {
    setCompletionNote("");
    setCompleteOpen(true);
  }

  async function saveSnooze() {
    if (!activeReminder) {
      return;
    }

    const nextFollowupAt = buildSelectedDateTime(snoozeDate, snoozeHour, snoozeMinute, snoozePeriod);

    if (!nextFollowupAt) {
      setToastMessage("Select a valid follow-up date and time");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/leads/${activeReminder.leadId}/followup-snooze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nextFollowupAt: nextFollowupAt.toISOString(),
          snoozeNote,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "Unable to snooze follow-up.");
      }

      closeActiveReminder();
      setToastMessage("Follow-up snoozed successfully");
    } catch (error) {
      console.error("Unable to snooze follow-up", error);
      setToastMessage(error instanceof Error ? error.message : "Unable to snooze follow-up");
    } finally {
      setSubmitting(false);
    }
  }

  async function saveCompletion() {
    if (!activeReminder) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/leads/${activeReminder.leadId}/followup-complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completionNote,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? "Unable to complete follow-up.");
      }

      closeActiveReminder();
      setToastMessage("Follow-up marked as completed");
    } catch (error) {
      console.error("Unable to complete follow-up", error);
      setToastMessage(error instanceof Error ? error.message : "Unable to complete follow-up");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {toastMessage ? (
        <div className="fixed right-4 top-4 z-[120] rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-2xl shadow-slate-950/15">
          {toastMessage}
        </div>
      ) : null}

      {activeReminder ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl shadow-slate-950/20">
            <div className="flex items-start justify-between gap-4 px-6 pb-3 pt-5">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  Follow-up Reminder
                </h2>
                <p className="mt-1 truncate text-sm text-slate-500">{reminderSubtitle}</p>
              </div>
              <button
                type="button"
                onClick={closeActiveReminder}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close reminder"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-3 px-6 pb-5 pt-2">
              <section className="rounded-2xl border border-blue-100/70 bg-blue-50/65 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-500">Lead</p>
                <div className="mt-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-slate-950">
                      {activeReminder.leadName}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">{activeReminder.mobile}</p>
                  </div>
                  {activeReminder.whatsappNumber ? (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-green-600 shadow-sm ring-1 ring-green-100">
                      <MessageCircle size={19} />
                    </span>
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm ring-1 ring-blue-100">
                      <PhoneCall size={19} />
                    </span>
                  )}
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-500">
                    Follow-up Type
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">
                    {activeReminder.followupType || "Call"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-500">
                    Follow-up Note
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                    {activeReminder.followupNote}
                  </p>
                </div>
              </section>

              <div className="grid gap-2 pt-1 sm:grid-cols-2">
                <Button
                  type="button"
                  className="h-11 rounded-xl bg-green-600 text-sm font-semibold shadow-sm shadow-green-600/20 hover:bg-green-700"
                  onClick={() => window.open(`https://wa.me/${activeReminder.whatsappNumber}`, "_blank")}
                  disabled={!activeReminder.whatsappNumber}
                >
                  <MessageCircle size={16} />
                  Chat on WhatsApp
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                  onClick={() => {
                    closeActiveReminder();
                    router.push("/dashboard/lead-management/all-leads");
                  }}
                >
                  Open Lead
                </Button>
                <Button
                  type="button"
                  className="h-11 rounded-xl bg-green-600 text-sm font-semibold shadow-sm shadow-green-600/20 hover:bg-green-700"
                  onClick={openCompleteModal}
                  disabled={submitting}
                >
                  <CheckCircle2 size={16} />
                  Mark as Completed
                </Button>
                <Button
                  type="button"
                  className="h-11 rounded-xl bg-blue-600 text-sm font-semibold shadow-sm shadow-blue-600/20 hover:bg-blue-700"
                  onClick={openSnoozeModal}
                  disabled={submitting}
                >
                  <Clock3 size={16} />
                  Snooze
                </Button>
              </div>

              <Button
                type="button"
                variant="ghost"
                className="h-10 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                onClick={closeActiveReminder}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {activeReminder && snoozeOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-5 shadow-2xl shadow-slate-950/20">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Snooze Follow-up</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Current follow-up: {formatReminderDate(activeReminder.nextFollowupAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSnoozeOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close snooze"
              >
                <X size={17} />
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <textarea
                value={snoozeNote}
                onChange={(event) => setSnoozeNote(event.target.value)}
                placeholder="Snooze note / reason"
                className="min-h-24 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
              <input
                type="date"
                value={snoozeDate}
                onChange={(event) => setSnoozeDate(event.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
              <div className="grid grid-cols-[1fr_1fr_1fr] gap-2">
                <select
                  value={snoozeHour}
                  onChange={(event) => setSnoozeHour(event.target.value)}
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  aria-label="Hour"
                >
                  {hourOptions.map((hour) => (
                    <option key={hour} value={hour}>
                      {hour}
                    </option>
                  ))}
                </select>
                <select
                  value={snoozeMinute}
                  onChange={(event) => setSnoozeMinute(event.target.value)}
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  aria-label="Minute"
                >
                  {minuteOptions.map((minute) => (
                    <option key={minute} value={minute}>
                      {minute}
                    </option>
                  ))}
                </select>
                <select
                  value={snoozePeriod}
                  onChange={(event) => setSnoozePeriod(event.target.value)}
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  aria-label="AM or PM"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                className="rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                onClick={() => setSnoozeOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700"
                onClick={() => void saveSnooze()}
                disabled={submitting}
              >
                Save Snooze
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {activeReminder && completeOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-5 shadow-2xl shadow-slate-950/20">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Complete Follow-up</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Mark {activeReminder.followupType || "follow-up"} for lead {activeReminder.leadName} as completed.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCompleteOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close complete follow-up"
              >
                <X size={17} />
              </button>
            </div>

            <textarea
              value={completionNote}
              onChange={(event) => setCompletionNote(event.target.value)}
              placeholder="Add the follow-up outcome, next context, or visit notes..."
              className="mt-5 min-h-32 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-green-300 focus:ring-4 focus:ring-green-100"
            />

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                className="rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                onClick={() => setCompleteOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-xl bg-green-600 text-white shadow-sm shadow-green-600/20 hover:bg-green-700"
                onClick={() => void saveCompletion()}
                disabled={submitting}
              >
                Complete Follow-up
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
