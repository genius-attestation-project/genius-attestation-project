"use client";

import { CheckCircle2, Clock3, MessageCircle, PhoneCall, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";

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

const snoozeOptions = [
  { label: "10 minutes", value: "10m" },
  { label: "30 minutes", value: "30m" },
  { label: "1 hour", value: "1h" },
  { label: "Tomorrow", value: "tomorrow" },
];

function formatReminderDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function FollowupReminderProvider({
  userId,
  ownerAdminId,
}: FollowupReminderProviderProps) {
  const router = useRouter();
  const [reminders, setReminders] = useState<FollowupReminder[]>([]);
  const [snoozeFor, setSnoozeFor] = useState("10m");
  const [submitting, setSubmitting] = useState(false);
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

    let socket: Socket | null = null;
    let ignore = false;

    async function connectSocket() {
      await fetch("/api/socket", { cache: "no-store" }).catch((error) => {
        console.error("Unable to initialize follow-up socket", error);
      });

      if (ignore) {
        return;
      }

      socket = io({
        path: "/api/socket_io",
        addTrailingSlash: false,
        query: { userId, ownerAdminId },
      });

      socket.on("followup-reminder", (data: FollowupReminder) => {
        setReminders((current) => {
          if (current.some((item) => item.leadId === data.leadId)) {
            return current;
          }

          return [...current, data];
        });
      });
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

    void connectSocket();
    void loadDueFollowups();
    const interval = window.setInterval(() => void loadDueFollowups(), 60_000);

    return () => {
      ignore = true;
      window.clearInterval(interval);
      socket?.disconnect();
    };
  }, [ownerAdminId, userId]);

  function closeActiveReminder() {
    setReminders((current) => current.slice(1));
  }

  async function markCompleted() {
    if (!activeReminder) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/leads/${activeReminder.leadId}/followup-complete`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Unable to complete follow-up.");
      }

      closeActiveReminder();
    } catch (error) {
      console.error("Unable to complete follow-up", error);
    } finally {
      setSubmitting(false);
    }
  }

  async function snoozeReminder() {
    if (!activeReminder) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/leads/${activeReminder.leadId}/followup-snooze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snoozeFor }),
      });

      if (!response.ok) {
        throw new Error("Unable to snooze follow-up.");
      }

      closeActiveReminder();
    } catch (error) {
      console.error("Unable to snooze follow-up", error);
    } finally {
      setSubmitting(false);
    }
  }

  if (!activeReminder) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl shadow-slate-950/20 dark:border-white/10 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4 px-6 pb-3 pt-5">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
              Follow-up Reminder
            </h2>
            <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
              {reminderSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={closeActiveReminder}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Close reminder"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-3 px-6 pb-5 pt-2">
          <section className="rounded-2xl border border-blue-100/70 bg-blue-50/65 p-4 dark:border-blue-500/15 dark:bg-blue-500/10">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-500">Lead</p>
            <div className="mt-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-slate-950 dark:text-white">
                  {activeReminder.leadName}
                </p>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  {activeReminder.mobile}
                </p>
              </div>
              {activeReminder.whatsappNumber ? (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-green-600 shadow-sm ring-1 ring-green-100 dark:bg-white/10 dark:ring-green-500/20">
                  <MessageCircle size={19} />
                </span>
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm ring-1 ring-blue-100 dark:bg-white/10 dark:ring-blue-500/20">
                  <PhoneCall size={19} />
                </span>
              )}
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-500">
                Follow-up Type
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">
                {activeReminder.followupType || "Call"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-500">
                Follow-up Note
              </p>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
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
              className="h-11 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              onClick={() => {
                closeActiveReminder();
                router.push("/dashboard/lead-management/all-leads");
              }}
            >
              Open Lead
            </Button>
            <Button
              type="button"
              className="h-11 rounded-xl bg-blue-600 text-sm font-semibold shadow-sm shadow-blue-600/20 hover:bg-blue-700"
              onClick={() => void markCompleted()}
              disabled={submitting}
            >
              <CheckCircle2 size={16} />
              Mark as Completed
            </Button>
            <div className="flex min-w-0 gap-2">
              <select
                value={snoozeFor}
                onChange={(event) => setSnoozeFor(event.target.value)}
                className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100 dark:border-white/10 dark:bg-slate-900 dark:text-white"
              >
                {snoozeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                className="h-11 shrink-0 rounded-xl bg-orange-500 px-3 text-sm font-semibold shadow-sm shadow-orange-500/20 hover:bg-orange-600"
                onClick={() => void snoozeReminder()}
                disabled={submitting}
              >
                <Clock3 size={16} />
                Snooze
              </Button>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            className="h-10 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
            onClick={closeActiveReminder}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
