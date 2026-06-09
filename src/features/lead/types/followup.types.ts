import type { LeadRow } from "@/features/lead/types/lead.types";

export type FollowupFilter = "all" | "today" | "upcoming" | "missed" | "completed";

export type FollowupTone = "pending" | "completed" | "rescheduled" | "missed";

export type FollowupHistoryItem = {
  id: string;
  leadId: string;
  actionType: "Created" | "Snoozed" | "Completed" | "Rescheduled";
  oldDate: string | null;
  newDate: string | null;
  description: string;
  userId: string;
  createdAt: string;
  createdAtLabel: string;
  oldDateLabel: string;
  newDateLabel: string;
};

export type FollowupItem = LeadRow & {
  title: string;
  dateKey: string;
  followupDate: string;
  followupDateLabel: string;
  followupTimeLabel: string;
  followupDateTimeLabel: string;
  followupStatusLabel: string;
  statusTone: FollowupTone;
  calendarColor: string;
  isToday: boolean;
  isOverdue: boolean;
  isCompleted: boolean;
  whatsappLink: string;
  callLink: string;
  history: FollowupHistoryItem[];
};

export type FollowupCalendarEvent = {
  id: string;
  title: string;
  start: string;
  allDay: boolean;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: {
    dateKey: string;
    service: string;
    assignedUser: string;
    statusTone: FollowupTone;
    followup: FollowupItem;
  };
};

export type FollowupCounts = {
  all: number;
  today: number;
  upcoming: number;
  missed: number;
  completed: number;
};

export type FollowupCalendarResponse = {
  filter: FollowupFilter;
  today: string;
  counts: FollowupCounts;
  items: FollowupItem[];
  events: FollowupCalendarEvent[];
};

export type FollowupsByDateResponse = {
  date: string;
  label: string;
  count: number;
  items: FollowupItem[];
};

export type FollowupHistoryResponse = {
  leadId: string;
  items: FollowupHistoryItem[];
};
