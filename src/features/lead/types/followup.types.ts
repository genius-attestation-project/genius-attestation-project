import type { LeadRow } from "@/features/lead/types/lead.types";

export type FollowupFilter = "all" | "today" | "upcoming" | "missed" | "completed";

export type FollowupTone = "new" | "completed" | "upcoming" | "missed" | "qualified";

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
