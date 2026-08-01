import { FollowupActionType, FollowupStatus, LeadStatus, Prisma } from "@prisma/client";

import { buildDataScopeFilter } from "@/lib/data-scope";
import { env } from "@/config/env";
import { prisma } from "@/lib/prisma";
import {
  createLeadApprovalRequest,
  getOwnerApprovalRequestCount,
  requiresLeadApproval,
} from "@/features/lead/server/lead-approval.service";
import {
  FOLLOWUP_LOCK_MESSAGE,
  getUserLockState,
} from "@/features/lead/server/followup-lock.service";
import { getAdvancePaymentStats } from "@/features/revenue/server/advance-payment-approval.service";
import type {
  DashboardStatsResponse,
  LeadFilterOptionsResponse,
  LeadListResponse,
  LeadAssignableUser,
  LeadRow,
  LobResponse,
} from "@/features/lead/types/lead.types";
import type {
  FollowupCalendarEvent,
  FollowupCalendarResponse,
  FollowupCounts,
  FollowupFilter,
  FollowupItem,
  FollowupTone,
  FollowupsByDateResponse,
} from "@/features/lead/types/followup.types";
import type { LeadInput } from "@/features/lead/validations/lead.schema";

const leadSelect = {
  id: true,
  leadCode: true,
  firstName: true,
  lastName: true,
  countryCode: true,
  mobileNumber: true,
  email: true,
  service: true,
  leadStatus: true,
  country: true,
  amount: true,
  assignedUserId: true,
  assignedUser: true,
  ownerAdminId: true,
  createdById: true,
  creator: {
    select: {
      id: true,
      name: true,
      email: true,
      officeLocationId: true,
      officeLocationName: true,
      officeLocationRef: {
        select: {
          officeName: true,
          location: true,
        },
      },
    },
  },
  createdAt: true,
  remark: true,
  nextFollowupAt: true,
  followupNotified: true,
  followupCompleted: true,
  followupStatus: true,
  completionDescription: true,
  followupCompletionNote: true,
  followupCompletedAt: true,
  snoozeNote: true,
  completedAt: true,
  completedBy: true,
  docType: true,
  noOfDocuments: true,
  state: true,
  documentIssuedCountry: true,
  source: true,
  clientType: true,
  corporateDetailId: true,
  corporateDetail: {
    select: {
      id: true,
      companyName: true,
    },
  },
  workingDays: true,
  followupHistory: {
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      leadId: true,
      actionType: true,
      oldDate: true,
      newDate: true,
      description: true,
      userId: true,
      createdAt: true,
    },
  },
} satisfies Prisma.LeadSelect;

type LeadRecord = Prisma.LeadGetPayload<{
  select: typeof leadSelect;
}>;

const legacyLeadSelect = {
  id: true,
  leadCode: true,
  firstName: true,
  lastName: true,
  countryCode: true,
  mobileNumber: true,
  email: true,
  service: true,
  leadStatus: true,
  country: true,
  amount: true,
  assignedUserId: true,
  assignedUser: true,
  ownerAdminId: true,
  createdById: true,
  createdAt: true,
  remark: true,
  nextFollowupAt: true,
  docType: true,
  noOfDocuments: true,
  state: true,
  documentIssuedCountry: true,
  source: true,
  clientType: true,
  workingDays: true,
} satisfies Prisma.LeadSelect;

type LegacyLeadRecord = Prisma.LeadGetPayload<{
  select: typeof legacyLeadSelect;
}>;

function isMissingFollowupSchemaError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return [
    "followup_status",
    "completion_description",
    "completed_at",
    "completed_by",
    "followup_completed_at",
    "followup_completion_note",
    "snooze_note",
    "lead_followup_history",
    "followuphistory",
    "column does not exist",
    "table does not exist",
  ].some((fragment) => message.includes(fragment));
}

function formatLeadStatus(status: LeadStatus): LeadRow["status"] {
  if (status === LeadStatus.Pending_Approval) return "Pending Approval";
  if (status === LeadStatus.Potential_Qualified) return "Potential Qualified";
  return status;
}

function parseLeadStatus(status?: string): LeadStatus | undefined {
  if (!status || status === "all") {
    return undefined;
  }

  if (status === "Pending Approval") {
    return LeadStatus.Pending_Approval;
  }

  if (status === "Potential Qualified") {
    return LeadStatus.Potential_Qualified;
  }

  if (Object.values(LeadStatus).includes(status as LeadStatus)) {
    return status as LeadStatus;
  }

  return undefined;
}

function formatCurrency(amount: Prisma.Decimal | number) {
  const numericValue = typeof amount === "number" ? amount : Number(amount);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(numericValue);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatRelativeTime(date: Date) {
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));

  if (Math.abs(diffMinutes) < 60) {
    return `${Math.abs(diffMinutes)} min ${diffMinutes >= 0 ? "from now" : "ago"}`;
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (Math.abs(diffHours) < 24) {
    return `${Math.abs(diffHours)} hr ${diffHours >= 0 ? "from now" : "ago"}`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} ${diffDays >= 0 ? "from now" : "ago"
    }`;
}

function mapLeadRow(lead: LeadRecord): LeadRow {
  const creatorName = lead.creator?.name?.trim() || lead.creator?.email || "";
  const officeLocationName =
    lead.creator?.officeLocationName?.trim() ||
    [lead.creator?.officeLocationRef?.officeName, lead.creator?.officeLocationRef?.location]
      .filter(Boolean)
      .join(" - ");

  return {
    id: lead.id,
    leadCode: lead.leadCode,
    clientName: [lead.firstName, lead.lastName].filter(Boolean).join(" "),
    firstName: lead.firstName,
    lastName: lead.lastName ?? "",
    countryCode: lead.countryCode,
    mobileNumber: lead.mobileNumber,
    mobile: `${lead.countryCode} ${lead.mobileNumber}`.trim(),
    email: lead.email,
    docType: lead.docType ?? "",
    noOfDocuments: lead.noOfDocuments ? String(lead.noOfDocuments) : "",
    service: lead.service,
    status: formatLeadStatus(lead.leadStatus),
    country: lead.country,
    state: lead.state ?? "",
    documentIssuedCountry: lead.documentIssuedCountry ?? "",
    source: lead.source ?? "",
    clientType: lead.clientType ?? "",
    corporateDetailId: lead.corporateDetailId ?? "",
    corporateCompanyName: lead.corporateDetail?.companyName ?? "",
    amount: formatCurrency(lead.amount),
    workingDays: lead.workingDays ? String(lead.workingDays) : "",
    assignedUserId: lead.assignedUserId ?? "",
    assignedUser: lead.assignedUser ?? "",
    createdById: lead.createdById ?? "",
    createdByName: creatorName,
    createdByEmail: lead.creator?.email ?? "",
    officeLocationId: lead.creator?.officeLocationId ?? "",
    officeLocationName,
    createdDate: formatDate(lead.createdAt),
    createdAt: lead.createdAt.toISOString(),
    remark: lead.remark ?? "",
    rawAmount: Number(lead.amount),
    nextFollowupAt: lead.nextFollowupAt ? lead.nextFollowupAt.toISOString() : null,
    followupStatus: lead.followupStatus,
    completionDescription: lead.completionDescription ?? "",
    completedAt: lead.completedAt ? lead.completedAt.toISOString() : null,
    completedBy: lead.completedBy ?? "",
  };
}

function mapLegacyLeadRow(lead: LegacyLeadRecord): LeadRow {
  return {
    id: lead.id,
    leadCode: lead.leadCode,
    clientName: [lead.firstName, lead.lastName].filter(Boolean).join(" "),
    firstName: lead.firstName,
    lastName: lead.lastName ?? "",
    countryCode: lead.countryCode,
    mobileNumber: lead.mobileNumber,
    mobile: `${lead.countryCode} ${lead.mobileNumber}`.trim(),
    email: lead.email,
    docType: lead.docType ?? "",
    noOfDocuments: lead.noOfDocuments ? String(lead.noOfDocuments) : "",
    service: lead.service,
    status: formatLeadStatus(lead.leadStatus),
    country: lead.country,
    state: lead.state ?? "",
    documentIssuedCountry: lead.documentIssuedCountry ?? "",
    source: lead.source ?? "",
    clientType: lead.clientType ?? "",
    amount: formatCurrency(lead.amount),
    workingDays: lead.workingDays ? String(lead.workingDays) : "",
    assignedUserId: lead.assignedUserId ?? "",
    assignedUser: lead.assignedUser ?? "",
    createdById: lead.createdById ?? lead.ownerAdminId ?? "",
    createdByName: "",
    createdByEmail: "",
    officeLocationId: "",
    officeLocationName: "",
    createdDate: formatDate(lead.createdAt),
    createdAt: lead.createdAt.toISOString(),
    remark: lead.remark ?? "",
    rawAmount: Number(lead.amount),
    nextFollowupAt: lead.nextFollowupAt ? lead.nextFollowupAt.toISOString() : null,
    followupStatus: "Pending",
    completionDescription: "",
    completedAt: null,
    completedBy: "",
  };
}

function mapFollowupHistoryItem(
  item: LeadRecord["followupHistory"][number],
): FollowupItem["history"][number] {
  return {
    id: item.id,
    leadId: item.leadId,
    actionType: item.actionType,
    oldDate: item.oldDate ? item.oldDate.toISOString() : null,
    newDate: item.newDate ? item.newDate.toISOString() : null,
    description: item.description ?? "",
    userId: item.userId ?? "",
    createdAt: item.createdAt.toISOString(),
    createdAtLabel: formatDateTimeLong(item.createdAt),
    oldDateLabel: item.oldDate ? formatDateTimeLong(item.oldDate) : "",
    newDateLabel: item.newDate ? formatDateTimeLong(item.newDate) : "",
  };
}

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date: Date) {
  const value = startOfDay(date);
  value.setDate(value.getDate() + 1);
  return value;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function formatDateTimeLong(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function getFollowupTone(
  followupStatus: FollowupStatus,
  followupAt: Date,
  today: Date,
): FollowupTone {
  const todayStart = startOfDay(today);
  const followupStart = startOfDay(followupAt);

  if (followupStatus === FollowupStatus.Completed) {
    return "completed";
  }

  if (followupStart < todayStart) {
    return "missed";
  }

  if (followupStatus === FollowupStatus.Rescheduled) {
    return "rescheduled";
  }

  if (followupStart.getTime() === todayStart.getTime()) {
    return "today";
  }

  return "pending";
}

function getFollowupColor(tone: FollowupTone) {
  const palette: Record<FollowupTone, string> = {
    pending: "#2563eb", // blue (upcoming)
    today: "#16a34a", // green (today)
    completed: "#64748b", // gray (completed)
    rescheduled: "#ea580c", // orange
    missed: "#dc2626", // red (overdue)
  };

  return palette[tone];
}

function getFollowupStatusLabel(tone: FollowupTone) {
  const labels: Record<FollowupTone, string> = {
    pending: "Upcoming",
    today: "Today",
    completed: "Completed",
    rescheduled: "Rescheduled",
    missed: "Overdue",
  };

  return labels[tone];
}

function matchesFollowupFilter(item: FollowupItem, filter: FollowupFilter) {
  if (filter === "all") return true;
  if (filter === "today") return item.isToday;
  if (filter === "upcoming") return !item.isCompleted && !item.isToday && !item.isOverdue;
  if (filter === "missed") return item.isOverdue && !item.isCompleted;
  if (filter === "completed") return item.isCompleted;
  return true;
}

function mapFollowupItem(lead: LeadRecord, today: Date): FollowupItem {
  const base = mapLeadRow(lead);
  const followupAt = lead.nextFollowupAt ?? lead.createdAt;
  const dateKey = toDateKey(followupAt);
  const todayKey = toDateKey(today);
  const tone = getFollowupTone(lead.followupStatus, followupAt, today);
  const color = getFollowupColor(tone);
  const phoneNumber = `${lead.countryCode}${lead.mobileNumber}`.replace(/[^\d+]/g, "");

  return {
    ...base,
    title: `${base.clientName} - ${lead.service}`,
    dateKey,
    followupDate: followupAt.toISOString(),
    followupDateLabel: formatDate(followupAt),
    followupTimeLabel: formatTime(followupAt),
    followupDateTimeLabel: formatDateTime(followupAt),
    followupStatusLabel: getFollowupStatusLabel(tone),
    statusTone: tone,
    calendarColor: color,
    isToday: dateKey === todayKey,
    isOverdue: startOfDay(followupAt) < startOfDay(today),
    isCompleted: lead.followupStatus === FollowupStatus.Completed,
    whatsappLink: `https://wa.me/${phoneNumber.replace(/[^\d]/g, "")}`,
    callLink: `tel:${phoneNumber}`,
    history: lead.followupHistory.map(mapFollowupHistoryItem),
  };
}

function mapLegacyFollowupItem(lead: LegacyLeadRecord, today: Date): FollowupItem {
  const base = mapLegacyLeadRow(lead);
  const followupAt = lead.nextFollowupAt ?? lead.createdAt;
  const dateKey = toDateKey(followupAt);
  const todayKey = toDateKey(today);
  const isCompleted = false;
  const isOverdue = startOfDay(followupAt) < startOfDay(today);
  const tone: FollowupTone = isOverdue ? "missed" : "pending";
  const color = getFollowupColor(tone);
  const phoneNumber = `${lead.countryCode}${lead.mobileNumber}`.replace(/[^\d+]/g, "");

  return {
    ...base,
    title: `${base.clientName} - ${lead.service}`,
    dateKey,
    followupDate: followupAt.toISOString(),
    followupDateLabel: formatDate(followupAt),
    followupTimeLabel: formatTime(followupAt),
    followupDateTimeLabel: formatDateTime(followupAt),
    followupStatusLabel: getFollowupStatusLabel(tone),
    statusTone: tone,
    calendarColor: color,
    isToday: dateKey === todayKey,
    isOverdue,
    isCompleted,
    whatsappLink: `https://wa.me/${phoneNumber.replace(/[^\d]/g, "")}`,
    callLink: `tel:${phoneNumber}`,
    history: [],
  };
}

function buildFollowupCounts(items: FollowupItem[]): FollowupCounts {
  return items.reduce<FollowupCounts>(
    (counts, item) => {
      counts.all += 1;
      if (item.isToday) counts.today += 1;
      if (!item.isCompleted && !item.isToday && !item.isOverdue) counts.upcoming += 1;
      if (item.isOverdue && !item.isCompleted) counts.missed += 1;
      if (item.isCompleted) counts.completed += 1;
      return counts;
    },
    { all: 0, today: 0, upcoming: 0, missed: 0, completed: 0 },
  );
}

function buildCalendarEvents(items: FollowupItem[]): FollowupCalendarEvent[] {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    start: item.followupDate,
    allDay: false,
    backgroundColor: item.calendarColor,
    borderColor: item.calendarColor,
    textColor: "#ffffff",
    extendedProps: {
      dateKey: item.dateKey,
      service: item.service,
      assignedUser: item.assignedUser,
      statusTone: item.statusTone,
      followup: item,
    },
  }));
}

/**
 * Followup visibility owner:
 * - Lead Owner (createdById) sees the followup
 * - User assigned to the lead sees the followup
 * - User who created the followup sees the followup
 */
function leadCreatorWhere(ownerAdminId: string, userId?: string): Prisma.LeadWhereInput {
  if (!userId) {
    return { id: { in: [] } };
  }

  // To strictly enforce: DO NOT SHOW FOLLOWUPS TO Supervisor, Department Head, Other Staff
  // Owner Admin is still enforced, and we explicitly only show if:
  // 1. User created the lead (Lead Owner)
  // 2. User is assigned to the lead
  // 3. User created a followup for this lead
  return {
    ownerAdminId,
    OR: [
      { createdById: userId },
      { assignedUserId: userId },
      { followupHistory: { some: { userId } } },
    ],
  };
}

function visibleScheduledFollowupWhere(ownerAdminId: string, userId?: string): Prisma.LeadWhereInput {
  return {
    ...leadCreatorWhere(ownerAdminId, userId),
    nextFollowupAt: { not: null },
    followupCompleted: false,
    NOT: [
      { followupStatus: FollowupStatus.Completed },
      { leadStatus: { in: [LeadStatus.Closed, LeadStatus.LOB] } },
    ],
  };
}

function visibleLegacyScheduledFollowupWhere(ownerAdminId: string, userId?: string): Prisma.LeadWhereInput {
  return {
    ...leadCreatorWhere(ownerAdminId, userId),
    nextFollowupAt: { not: null },
    leadStatus: { notIn: [LeadStatus.Closed, LeadStatus.LOB] },
  };
}

async function listScheduledFollowupRecords(ownerAdminId: string, userId?: string, options?: { assignedUser?: string; officeLocationId?: string; leadStatus?: string }) {
  const where = visibleScheduledFollowupWhere(ownerAdminId, userId);
  if (options?.assignedUser) where.assignedUserId = options.assignedUser;
  if (options?.leadStatus) where.leadStatus = options.leadStatus as LeadStatus;
  if (options?.officeLocationId) where.creator = { officeLocationId: options.officeLocationId };

  return prisma.lead.findMany({
    where,
    orderBy: [{ nextFollowupAt: "asc" }, { updatedAt: "desc" }],
    select: leadSelect,
  });
}

async function listLegacyScheduledFollowupRecords(ownerAdminId: string, userId?: string, options?: { assignedUser?: string; officeLocationId?: string; leadStatus?: string }) {
  const where = visibleLegacyScheduledFollowupWhere(ownerAdminId, userId);
  if (options?.assignedUser) where.assignedUserId = options.assignedUser;
  if (options?.leadStatus) where.leadStatus = options.leadStatus as LeadStatus;
  if (options?.officeLocationId) where.creator = { officeLocationId: options.officeLocationId };

  return prisma.lead.findMany({
    where,
    orderBy: [{ nextFollowupAt: "asc" }, { updatedAt: "desc" }],
    select: legacyLeadSelect,
  });
}


function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isClosedLeadStatus(status: LeadStatus) {
  return status === LeadStatus.Closed;
}

function buildLeadData(
  input: LeadInput,
  leadCode?: string,
  existing?: {
    closedAt: Date | null;
    leadStatus: LeadStatus;
    followupNotified?: boolean;
    followupCompleted?: boolean;
    followupStatus?: FollowupStatus;
    completedAt?: Date | null;
    completedBy?: string | null;
    completionDescription?: string | null;
  },
): Prisma.LeadUncheckedCreateInput {
  const amount =
    typeof input.amount === "number" ? new Prisma.Decimal(input.amount) : new Prisma.Decimal(0);
  const leadStatus = parseLeadStatus(input.leadStatus) ?? LeadStatus.New;
  const closedAt =
    leadStatus === LeadStatus.Closed
      ? existing?.closedAt ?? new Date()
      : null;
  const nextFollowupAt = input.nextFollowupAt ?? null;
  const followupStatus =
    existing?.followupStatus ??
    (nextFollowupAt ? FollowupStatus.Pending : FollowupStatus.Pending);

  return {
    leadCode: leadCode ?? "",
    firstName: input.firstName,
    lastName: input.lastName || null,
    countryCode: input.countryCode,
    mobileNumber: input.mobileNumber,
    email: input.email,
    docType: input.docType || null,
    noOfDocuments:
      typeof input.noOfDocuments === "number" && input.noOfDocuments > 0
        ? input.noOfDocuments
        : null,
    country: input.country,
    state: input.state || null,
    documentIssuedCountry: input.documentIssuedCountry || null,
    service: input.service,
    source: input.source || null,
    leadStatus,
    clientType: input.clientType || null,
    corporateDetailId: input.corporateDetailId || null,
    amount,
    workingDays:
      typeof input.workingDays === "number" && input.workingDays > 0 ? input.workingDays : null,
    remark: input.remark || null,
    assignedUserId: input.assignedUserId || null,
    assignedUser: input.assignedUser || null,
    nextFollowupAt,
    followupNotified: existing?.followupNotified ?? false,
    followupCompleted: existing?.followupCompleted ?? false,
    followupStatus,
    completionDescription: existing?.completionDescription ?? null,
    completedAt: existing?.completedAt ?? null,
    completedBy: existing?.completedBy ?? null,
    closedAt,
  };
}

function getHistoryActionType(
  previousDate: Date | null,
  nextDate: Date | null,
): FollowupActionType | null {
  if (!nextDate) {
    return null;
  }

  if (!previousDate) {
    return FollowupActionType.Created;
  }

  return FollowupActionType.Rescheduled;
}

export async function listAssignableLeadUsers(ownerAdminId: string): Promise<LeadAssignableUser[]> {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [{ ownerAdminId }, { id: ownerAdminId }],
    },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  return users.map((user) => ({
    id: user.id,
    name: user.name?.trim() || user.email,
    email: user.email,
  }));
}

function uniqueTextOptions(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))),
  )
    .sort((left, right) => left.localeCompare(right))
    .map((value) => ({ label: value, value }));
}

export async function getLeadFilterOptions(ownerAdminId: string): Promise<LeadFilterOptionsResponse> {
  const [users, leads] = await Promise.all([
    prisma.user.findMany({
      where: {
        isActive: true,
        OR: [{ ownerAdminId }, { id: ownerAdminId }],
      },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        officeLocationId: true,
        officeLocationName: true,
        officeLocationRef: {
          select: {
            officeName: true,
            location: true,
          },
        },
      },
    }),
    prisma.lead.findMany({
      where: { ownerAdminId },
      distinct: ["country", "state", "service", "source", "assignedUserId", "assignedUser"],
      select: {
        country: true,
        state: true,
        service: true,
        source: true,
        assignedUserId: true,
        assignedUser: true,
      },
    }),
  ]);

  const officeLocations = new Map<string, { label: string; value: string }>();
  const assignedUsers = new Map<
    string,
    { label: string; value: string; description?: string; officeLocationId?: string }
  >();

  for (const user of users) {
    const userName = user.name?.trim() || user.email;
    assignedUsers.set(user.id, {
      label: userName,
      value: user.id,
      description: user.email,
      officeLocationId: user.officeLocationId ?? undefined,
    });

    if (user.officeLocationId) {
      const label =
        user.officeLocationName?.trim() ||
        [user.officeLocationRef?.officeName, user.officeLocationRef?.location]
          .filter(Boolean)
          .join(" - ");

      officeLocations.set(user.officeLocationId, {
        label: label || user.officeLocationId,
        value: user.officeLocationId,
      });
    }
  }

  for (const lead of leads) {
    if (lead.assignedUserId && !assignedUsers.has(lead.assignedUserId)) {
      assignedUsers.set(lead.assignedUserId, {
        label: lead.assignedUser || lead.assignedUserId,
        value: lead.assignedUserId,
      });
    }
  }

  return {
    createdBy: users.map((user) => ({
      label: user.name?.trim() || user.email,
      value: user.id,
      description: user.email,
    })),
    assignedTo: Array.from(assignedUsers.values()),
    countries: uniqueTextOptions(leads.map((lead) => lead.country)),
    states: uniqueTextOptions(leads.map((lead) => lead.state)),
    services: uniqueTextOptions(leads.map((lead) => lead.service)),
    sources: uniqueTextOptions(leads.map((lead) => lead.source)),
    officeLocations: Array.from(officeLocations.values()).sort((left, right) =>
      left.label.localeCompare(right.label),
    ),
  };
}

async function generateLeadCode() {
  const now = new Date();
  const year = String(now.getFullYear()).slice(2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const datePrefix = `${year}${month}${day}`;

  const latestLead = await prisma.lead.findFirst({
    where: { leadCode: { startsWith: `LD${datePrefix}` } },
    orderBy: { createdAt: "desc" },
    select: { leadCode: true },
  });

  const latestSequence = latestLead?.leadCode.slice(8);
  const nextValue = latestSequence ? Number.parseInt(latestSequence, 10) + 1 : 1;

  return `LD${datePrefix}${String(nextValue).padStart(3, "0")}`;
}

export async function listLeads(user: any, ownerAdminId: string, params: {
  page?: number;
  pageSize?: number;
  query?: string;
  status?: string;
  service?: string;
  assignedUserId?: string;
  createdById?: string;
  country?: string;
  state?: string;
  source?: string;
  followupDate?: string;
  officeLocationId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<LeadListResponse> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, Math.min(params.pageSize ?? 10, 5000));
  const status = parseLeadStatus(params.status);
  const query = params.query?.trim();
  const service = params.service?.trim();
  const assignedUserId = params.assignedUserId?.trim();
  const createdById = params.createdById?.trim();
  const country = params.country?.trim();
  const state = params.state?.trim();
  const source = params.source?.trim();
  const followupDate = params.followupDate?.trim();
  const officeLocationId = params.officeLocationId?.trim();
  const fromDate = params.fromDate?.trim();
  const toDate = params.toDate?.trim();
  const createdAt: Prisma.DateTimeFilter = {};
  const nextFollowupAt: Prisma.DateTimeNullableFilter = {};

  if (fromDate) {
    const parsed = new Date(`${fromDate}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      createdAt.gte = parsed;
    }
  }

  if (toDate) {
    const parsed = new Date(`${toDate}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      parsed.setDate(parsed.getDate() + 1);
      createdAt.lt = parsed;
    }
  }

  if (followupDate) {
    const parsed = new Date(`${followupDate}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      const end = new Date(parsed);
      end.setDate(end.getDate() + 1);
      nextFollowupAt.gte = parsed;
      nextFollowupAt.lt = end;
    }
  }

  const scopeFilter = buildDataScopeFilter(user, "leads.view", {
    createdByField: "createdById",
    assignedToField: "assignedUserId",
    departmentRelation: "creator",
    officeRelation: "creator",
  });

  const where: Prisma.LeadWhereInput = {
    ownerAdminId,
    AND: [
      Object.keys(scopeFilter).length > 0 ? scopeFilter : {},
      {
        ...(status ? { leadStatus: status } : {}),
        ...(service ? { service: { contains: service } } : {}),
        ...(createdById ? { createdById } : {}),
        ...(country ? { country: { equals: country } } : {}),
        ...(state ? { state: { equals: state } } : {}),
        ...(source ? { source: { equals: source } } : {}),
        ...(officeLocationId ? { creator: { officeLocationId } } : {}),
        ...(assignedUserId
          ? assignedUserId === "unassigned"
            ? { assignedUserId: null }
            : { assignedUserId }
          : {}),
        ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
        ...(Object.keys(nextFollowupAt).length > 0 ? { nextFollowupAt } : {}),
        ...(query
          ? {
            OR: [
              { leadCode: { contains: query } },
              { firstName: { contains: query } },
              { lastName: { contains: query } },
              { email: { contains: query } },
              { mobileNumber: { contains: query } },
              { service: { contains: query } },
              { assignedUser: { contains: query } },
              { country: { contains: query } },
            ],
          }
          : {}),
      }
    ]
  };

  const totalItems = await prisma.lead.count({ where });

  try {
    const items = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: leadSelect,
    });

    return {
      items: items.map(mapLeadRow),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
      },
    };
  } catch (error) {
    if (!isMissingFollowupSchemaError(error)) {
      throw error;
    }

    const legacyItems = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: legacyLeadSelect,
    });

    return {
      items: legacyItems.map(mapLegacyLeadRow),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
      },
    };
  }
}

export async function getLeadById(ownerAdminId: string, id: string) {
  try {
    const lead = await prisma.lead.findFirst({
      where: {
        ownerAdminId,
        OR: [{ id }, { leadCode: id }],
      },
      select: leadSelect,
    });

    return lead ? mapLeadRow(lead) : null;
  } catch (error) {
    if (!isMissingFollowupSchemaError(error)) {
      throw error;
    }

    const legacyLead = await prisma.lead.findFirst({
      where: {
        ownerAdminId,
        OR: [{ id }, { leadCode: id }],
      },
      select: legacyLeadSelect,
    });

    return legacyLead ? mapLegacyLeadRow(legacyLead) : null;
  }
}

export async function createLead(ownerAdminId: string, input: LeadInput, createdById?: string) {
  if (createdById) {
    const lockState = await getUserLockState(createdById);
    if (lockState?.isLocked) {
      throw new Error(lockState.lockReason ?? FOLLOWUP_LOCK_MESSAGE);
    }
  }

  const assignedUser =
    input.assignedUserId
      ? await prisma.user.findFirst({
        where: {
          id: input.assignedUserId,
          isActive: true,
          OR: [{ ownerAdminId }, { id: ownerAdminId }],
        },
        select: { id: true, name: true, email: true },
      })
      : null;

  if (input.assignedUserId && !assignedUser) {
    throw new Error("Assigned user not found.");
  }

  const leadCode = await generateLeadCode();
  const lead = await prisma.lead.create({
    data: {
      ...buildLeadData(
        {
          ...input,
          assignedUserId: assignedUser?.id ?? "",
          assignedUser: assignedUser?.name?.trim() || assignedUser?.email || "",
        },
        leadCode,
      ),
      ownerAdminId,
      createdById: createdById ?? ownerAdminId,
      ...(input.nextFollowupAt
        ? {
          followupHistory: {
            create: {
              actionType: FollowupActionType.Created,
              oldDate: null,
              newDate: input.nextFollowupAt,
              description: "Initial followup scheduled.",
              userId: assignedUser?.id ?? null,
              ownerAdminId,
            },
          },
        }
        : {}),
    },
    select: leadSelect,
  });

  return mapLeadRow(lead);
}

export async function updateLead(
  ownerAdminId: string,
  id: string,
  input: LeadInput,
  changedBy?: string,
  changedByUserId?: string,
) {
  if (changedByUserId) {
    const lockState = await getUserLockState(changedByUserId);
    if (lockState?.isLocked) {
      throw new Error(lockState.lockReason ?? FOLLOWUP_LOCK_MESSAGE);
    }
  }

  const existingLead = await prisma.lead.findFirst({
    where: {
      ownerAdminId,
      OR: [{ id }, { leadCode: id }],
    },
    select: {
      id: true,
      leadCode: true,
      leadStatus: true,
      closedAt: true,
      assignedUserId: true,
      assignedUser: true,
      nextFollowupAt: true,
      followupNotified: true,
      followupCompleted: true,
      followupStatus: true,
      completionDescription: true,
      completedAt: true,
      completedBy: true,
    },
  });

  if (!existingLead) {
    return null;
  }

  const newLeadStatus = parseLeadStatus(input.leadStatus) ?? LeadStatus.New;
  const statusChanged = existingLead.leadStatus !== newLeadStatus;
  
  let isSelfSupervisor = false;
  if (changedByUserId) {
    const requesterUser = await prisma.user.findUnique({
      where: { id: changedByUserId },
      select: { supervisorUserId: true }
    });
    // Check if the user is their own supervisor (or if they are explicitly resolved as such)
    if (requesterUser && (requesterUser.supervisorUserId === changedByUserId)) {
      isSelfSupervisor = true;
    }
  }
  
  const needsApproval = statusChanged && requiresLeadApproval(newLeadStatus) && !isSelfSupervisor;
  if (needsApproval && !changedByUserId) {
    throw new Error("Authenticated user is required to request approval.");
  }
  const assignedUser =
    input.assignedUserId
      ? await prisma.user.findFirst({
        where: {
          id: input.assignedUserId,
          isActive: true,
          OR: [{ ownerAdminId }, { id: ownerAdminId }],
        },
        select: { id: true, name: true, email: true },
      })
      : null;

  if (input.assignedUserId && !assignedUser) {
    throw new Error("Assigned user not found.");
  }

  const nextAssignedUserId = assignedUser?.id ?? null;
  const nextAssignedUserName = assignedUser?.name?.trim() || assignedUser?.email || null;
  const nextFollowupAt = input.nextFollowupAt ?? null;
  const followupChanged =
    (existingLead.nextFollowupAt?.getTime() ?? null) !== (nextFollowupAt?.getTime() ?? null);
  const followupActionType = getHistoryActionType(existingLead.nextFollowupAt, nextFollowupAt);
  const assignmentChanged =
    (existingLead.assignedUserId ?? null) !== nextAssignedUserId ||
    (existingLead.assignedUser ?? null) !== nextAssignedUserName;

  const [lead] = await prisma.$transaction([
    prisma.lead.update({
      where: { id: existingLead.id },
      data: {
        ...buildLeadData(
          {
            ...input,
            leadStatus: needsApproval
              ? (formatLeadStatus(existingLead.leadStatus) as LeadInput["leadStatus"])
              : input.leadStatus,
            assignedUserId: nextAssignedUserId ?? "",
            assignedUser: nextAssignedUserName ?? "",
          },
          existingLead.leadCode,
          {
            closedAt: existingLead.closedAt,
            followupNotified: nextFollowupAt
              ? followupChanged
                ? false
                : existingLead.followupNotified
              : false,
            followupCompleted: nextFollowupAt
              ? followupChanged
                ? false
                : existingLead.followupCompleted
              : false,
            leadStatus: needsApproval ? existingLead.leadStatus : newLeadStatus,
            followupStatus: nextFollowupAt
              ? followupChanged
                ? FollowupStatus.Rescheduled
                : existingLead.followupStatus
              : existingLead.followupStatus,
            completionDescription: nextFollowupAt ? null : existingLead.completionDescription,
            completedAt: nextFollowupAt ? null : existingLead.completedAt,
            completedBy: nextFollowupAt ? null : existingLead.completedBy,
          },
        ),
        ...(assignmentChanged
          ? {
            assignmentHistory: {
              create: {
                oldUserId: existingLead.assignedUserId ?? null,
                newUserId: nextAssignedUserId,
                changedBy: changedBy ?? null,
                ownerAdminId,
              },
            },
          }
          : {}),
        ...(followupChanged && followupActionType
          ? {
            followupHistory: {
              create: {
                actionType: followupActionType,
                oldDate: existingLead.nextFollowupAt,
                newDate: nextFollowupAt,
                description:
                  followupActionType === FollowupActionType.Created
                    ? "Followup scheduled from lead form."
                    : "Followup schedule updated from lead form.",
                userId: changedByUserId ?? null,
                ownerAdminId,
              },
            },
          }
          : {}),
      },
      select: leadSelect,
    }),
    ...(!needsApproval && statusChanged
      ? [
        prisma.leadStatusHistory.create({
          data: {
            leadId: existingLead.id,
            previousStatus: existingLead.leadStatus,
            newStatus: newLeadStatus,
            changedBy: changedBy ?? null,
            ownerAdminId: ownerAdminId,
          },
        }),
      ]
      : []),
  ]);

  if (needsApproval) {
    if (!changedByUserId) {
      throw new Error("Authenticated user is required to request approval.");
    }

    if (newLeadStatus === LeadStatus.LOB) {
      const { createLobWorkflowRequest } = await import("./workflow-approval.service");
      const approval = await createLobWorkflowRequest({
        ownerAdminId,
        leadId: existingLead.id,
        requestedBy: changedByUserId,
      });

      return {
        lead: mapLeadRow(lead),
        approvalRequested: true,
        message: "LOB Approval Requested",
      };
    }

    const approval = await createLeadApprovalRequest({
      ownerAdminId,
      leadId: existingLead.id,
      currentStatus: existingLead.leadStatus,
      requestedStatus: newLeadStatus,
      requestedBy: changedByUserId,
    });

    return {
      lead: mapLeadRow(lead),
      approvalRequested: true,
      message: approval.notificationMessage,
    };
  }

  return {
    lead: mapLeadRow(lead),
    approvalRequested: false,
    message: "Lead updated successfully.",
  };
}

export async function bulkAssignLeads(args: {
  ownerAdminId: string;
  leadIds: string[];
  assignedUserId: string;
  changedBy?: string;
}) {
  const leadIds = Array.from(new Set(args.leadIds.map((id) => id.trim()).filter(Boolean)));

  if (leadIds.length === 0) {
    return { count: 0, assignedUserName: "" };
  }

  const assignedUser = await prisma.user.findFirst({
    where: {
      id: args.assignedUserId,
      isActive: true,
      OR: [{ ownerAdminId: args.ownerAdminId }, { id: args.ownerAdminId }],
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!assignedUser) {
    throw new Error("Assigned user not found.");
  }

  const assignedUserName = assignedUser.name?.trim() || assignedUser.email;
  const leads = await prisma.lead.findMany({
    where: {
      ownerAdminId: args.ownerAdminId,
      id: { in: leadIds },
    },
    select: {
      id: true,
      assignedUserId: true,
      assignedUser: true,
    },
  });

  const changedLeads = leads.filter(
    (lead) => lead.assignedUserId !== assignedUser.id || (lead.assignedUser ?? "") !== assignedUserName,
  );

  if (changedLeads.length === 0) {
    return { count: 0, assignedUserName };
  }

  await prisma.$transaction([
    prisma.lead.updateMany({
      where: {
        ownerAdminId: args.ownerAdminId,
        id: { in: changedLeads.map((lead) => lead.id) },
      },
      data: {
        assignedUserId: assignedUser.id,
        assignedUser: assignedUserName,
      },
    }),
    prisma.leadAssignmentHistory.createMany({
      data: changedLeads.map((lead) => ({
        leadId: lead.id,
        oldUserId: lead.assignedUserId ?? null,
        newUserId: assignedUser.id,
        changedBy: args.changedBy ?? null,
        ownerAdminId: args.ownerAdminId,
      })),
    }),
  ]);

  return {
    count: changedLeads.length,
    assignedUserName,
  };
}

export async function deleteLead(ownerAdminId: string, id: string) {
  const existingLead = await prisma.lead.findFirst({
    where: {
      ownerAdminId,
      OR: [{ id }, { leadCode: id }],
    },
    select: { id: true },
  });

  if (!existingLead) {
    return false;
  }

  await prisma.lead.delete({
    where: { id: existingLead.id },
  });

  return true;
}

export async function listClosedLeads(ownerAdminId: string) {
  // Pass an empty user or handle appropriately if listClosedLeads needs user context.
  // Assuming listClosedLeads doesn't need user scope, or we can pass a dummy user with All scope.
  return listLeads({ isSuperAdmin: true }, ownerAdminId, { status: LeadStatus.Closed, pageSize: 50 });
}

export async function listPendingLeads(ownerAdminId: string) {
  return listLeads({ isSuperAdmin: true }, ownerAdminId, { status: LeadStatus.Pending_Approval, pageSize: 50 });
}

export async function listFollowups(ownerAdminId: string, userId?: string) {
  try {
    const items = await listScheduledFollowupRecords(ownerAdminId, userId);

    return {
      items: items.map(mapLeadRow),
      pagination: {
        page: 1,
        pageSize: 50,
        totalItems: items.length,
        totalPages: 1,
      },
    };
  } catch (error) {
    if (!isMissingFollowupSchemaError(error)) {
      throw error;
    }

    const legacyItems = await listLegacyScheduledFollowupRecords(ownerAdminId, userId);

    return {
      items: legacyItems.map(mapLegacyLeadRow),
      pagination: {
        page: 1,
        pageSize: 50,
        totalItems: legacyItems.length,
        totalPages: 1,
      },
    };
  }
}

export async function snoozeFollowupWithHistory(args: {
  ownerAdminId: string;
  userId?: string;
  leadId: string;
  nextFollowupAt: Date;
  description?: string;
  snoozeNote?: string;
  changedByUserId?: string;
  changedBy?: string;
}) {
  if (args.changedByUserId) {
    const lockState = await getUserLockState(args.changedByUserId);
    if (lockState?.isLocked) {
      throw new Error(lockState.lockReason ?? FOLLOWUP_LOCK_MESSAGE);
    }
  }

  const lead = await prisma.lead.findFirst({
    where: {
      ...leadCreatorWhere(args.ownerAdminId, args.userId),
      id: args.leadId,
    },
    select: {
      id: true,
      nextFollowupAt: true,
    },
  });

  if (!lead) {
    return null;
  }

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      nextFollowupAt: args.nextFollowupAt,
      followupNotified: false,
      followupCompleted: false,
      followupStatus: lead.nextFollowupAt ? FollowupStatus.Rescheduled : FollowupStatus.Pending,
      completionDescription: null,
      snoozeNote: args.snoozeNote?.trim() || null,
      completedAt: null,
      completedBy: null,
      snoozedAt: new Date(),
      snoozedBy: args.changedBy ?? args.changedByUserId ?? null,
      followupHistory: {
        create: {
          actionType: FollowupActionType.Snoozed,
          oldDate: lead.nextFollowupAt,
          newDate: args.nextFollowupAt,
          description: args.description?.trim() || "Followup snoozed to a new date and time.",
          userId: args.changedByUserId ?? args.changedBy ?? null,
          ownerAdminId: args.ownerAdminId,
        },
      },
    },
  });

  return getLeadById(args.ownerAdminId, args.leadId);
}

export async function completeFollowupWithDescription(args: {
  ownerAdminId: string;
  userId?: string;
  leadId: string;
  completionDescription: string;
  completionNote?: string;
  changedByUserId?: string;
  changedBy?: string;
}) {
  if (args.changedByUserId) {
    const lockState = await getUserLockState(args.changedByUserId);
    if (lockState?.isLocked) {
      throw new Error(lockState.lockReason ?? FOLLOWUP_LOCK_MESSAGE);
    }
  }

  const lead = await prisma.lead.findFirst({
    where: {
      ...leadCreatorWhere(args.ownerAdminId, args.userId),
      id: args.leadId,
    },
    select: {
      id: true,
      nextFollowupAt: true,
    },
  });

  if (!lead) {
    return null;
  }

  const completedAt = new Date();

  try {
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        followupCompleted: true,
        followupNotified: true,
        followupStatus: FollowupStatus.Completed,
        completionDescription: args.completionDescription.trim(),
        followupCompletionNote: args.completionNote?.trim() || args.completionDescription.trim(),
        followupCompletedAt: completedAt,
        completedAt,
        completedBy: args.changedBy ?? "",
        followupHistory: {
          create: {
            actionType: FollowupActionType.Completed,
            oldDate: lead.nextFollowupAt,
            newDate: lead.nextFollowupAt,
            description: args.completionDescription.trim(),
            userId: args.changedByUserId ?? args.changedBy ?? null,
            ownerAdminId: args.ownerAdminId,
          },
        },
      },
    });
  } catch (error) {
    if (!isMissingFollowupSchemaError(error)) {
      throw error;
    }

    try {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          followupCompleted: true,
          followupNotified: true,
        },
      });
    } catch (legacyError) {
      if (!isMissingFollowupSchemaError(legacyError)) {
        throw legacyError;
      }

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          nextFollowupAt: null,
        },
      });
    }
  }

  return getLeadById(args.ownerAdminId, args.leadId);
}

export async function getFollowupHistory(ownerAdminId: string, leadId: string, userId?: string) {
  try {
    const lead = await prisma.lead.findFirst({
      where: {
        ...leadCreatorWhere(ownerAdminId, userId),
        id: leadId,
      },
      select: {
        id: true,
        followupHistory: {
          orderBy: [{ createdAt: "desc" }],
          select: {
            id: true,
            leadId: true,
            actionType: true,
            oldDate: true,
            newDate: true,
            description: true,
            userId: true,
            createdAt: true,
          },
        },
      },
    });

    if (!lead) {
      return null;
    }

    return {
      leadId: lead.id,
      items: lead.followupHistory.map(mapFollowupHistoryItem),
    };
  } catch (error) {
    if (!isMissingFollowupSchemaError(error)) {
      throw error;
    }

    const lead = await prisma.lead.findFirst({
      where: {
        ...leadCreatorWhere(ownerAdminId, userId),
        id: leadId,
      },
      select: {
        id: true,
      },
    });

    if (!lead) {
      return null;
    }

    return {
      leadId: lead.id,
      items: [],
    };
  }
}

export async function getFollowupCalendar(
  ownerAdminId: string,
  filter: FollowupFilter = "all",
  userId?: string,
  options?: { assignedUser?: string; officeLocationId?: string; leadStatus?: string },
): Promise<FollowupCalendarResponse> {
  const today = new Date();
  try {
    const records = await listScheduledFollowupRecords(ownerAdminId, userId, options);
    const items = records.map((lead) => mapFollowupItem(lead, today));
    const counts = buildFollowupCounts(items);
    const filteredItems = items.filter((item) => matchesFollowupFilter(item, filter));

    return {
      filter,
      today: toDateKey(today),
      counts,
      items: filteredItems,
      events: buildCalendarEvents(filteredItems),
    };
  } catch (error) {
    if (!isMissingFollowupSchemaError(error)) {
      throw error;
    }

    const records = await listLegacyScheduledFollowupRecords(ownerAdminId, userId, options);
    const items = records.map((lead) => mapLegacyFollowupItem(lead, today));
    const counts = buildFollowupCounts(items);
    const filteredItems = items.filter((item) => matchesFollowupFilter(item, filter));

    return {
      filter,
      today: toDateKey(today),
      counts,
      items: filteredItems,
      events: buildCalendarEvents(filteredItems),
    };
  }
}

export async function getTodayFollowups(ownerAdminId: string, userId?: string): Promise<FollowupCalendarResponse> {
  return getFollowupCalendar(ownerAdminId, "today", userId);
}

export async function getUpcomingFollowups(ownerAdminId: string, userId?: string): Promise<FollowupCalendarResponse> {
  return getFollowupCalendar(ownerAdminId, "upcoming", userId);
}

export async function getFollowupsByDate(
  ownerAdminId: string,
  date: string,
  userId?: string,
): Promise<FollowupsByDateResponse> {
  const [year, month, day] = date.split("-").map((value) => Number.parseInt(value, 10));

  if (!year || !month || !day) {
    return {
      date,
      label: date,
      count: 0,
      items: [],
    };
  }

  const selectedDate = new Date(year, month - 1, day);
  try {
    const records = await prisma.lead.findMany({
      where: {
        ...visibleScheduledFollowupWhere(ownerAdminId, userId),
        nextFollowupAt: {
          gte: startOfDay(selectedDate),
          lt: endOfDay(selectedDate),
        },
      },
      orderBy: [{ nextFollowupAt: "asc" }, { updatedAt: "desc" }],
      select: leadSelect,
    });

    const items = records.map((lead) => mapFollowupItem(lead, new Date()));

    return {
      date: toDateKey(selectedDate),
      label: new Intl.DateTimeFormat("en-IN", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(selectedDate),
      count: items.length,
      items,
    };
  } catch (error) {
    if (!isMissingFollowupSchemaError(error)) {
      throw error;
    }

    const records = await prisma.lead.findMany({
      where: {
        ...visibleLegacyScheduledFollowupWhere(ownerAdminId, userId),
        nextFollowupAt: {
          gte: startOfDay(selectedDate),
          lt: endOfDay(selectedDate),
        },
      },
      orderBy: [{ nextFollowupAt: "asc" }, { updatedAt: "desc" }],
      select: legacyLeadSelect,
    });

    const items = records.map((lead) => mapLegacyFollowupItem(lead, new Date()));

    return {
      date: toDateKey(selectedDate),
      label: new Intl.DateTimeFormat("en-IN", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(selectedDate),
      count: items.length,
      items,
    };
  }
}

export type FollowupReminderPayload = {
  leadId: string;
  leadName: string;
  mobile: string;
  whatsappNumber: string;
  followupType: string;
  followupNote: string;
  nextFollowupAt: string;
};

function mapFollowupReminder(lead: Prisma.LeadGetPayload<{
  select: {
    id: true;
    firstName: true;
    lastName: true;
    countryCode: true;
    mobileNumber: true;
    service: true;
    remark: true;
    nextFollowupAt: true;
  };
}>): FollowupReminderPayload {
  const mobile = `${lead.countryCode} ${lead.mobileNumber}`.trim();

  return {
    leadId: lead.id,
    leadName: `${lead.firstName} ${lead.lastName ?? ""}`.trim(),
    mobile,
    whatsappNumber: `${lead.countryCode}${lead.mobileNumber}`.replace(/[^\d]/g, ""),
    followupType: "Call",
    followupNote: lead.remark || `${lead.service} follow-up is due.`,
    nextFollowupAt: lead.nextFollowupAt?.toISOString() ?? new Date().toISOString(),
  };
}

function userCanReceiveFollowup(args: {
  ownerAdminId: string;
  userId: string;
}): Prisma.LeadWhereInput {
  return leadCreatorWhere(args.ownerAdminId, args.userId);
}

export async function listDueFollowupReminders(args: {
  ownerAdminId: string;
  userId: string;
  markNotified?: boolean;
}): Promise<FollowupReminderPayload[]> {
  const now = new Date();
  const leads = await prisma.lead.findMany({
    where: {
      ...userCanReceiveFollowup(args),
      nextFollowupAt: { lte: now },
      followupCompleted: false,
      followupNotified: false,
      NOT: [
        { followupStatus: FollowupStatus.Completed },
        { leadStatus: { in: [LeadStatus.Closed, LeadStatus.LOB] } },
      ],
    },
    orderBy: [{ nextFollowupAt: "asc" }, { updatedAt: "desc" }],
    take: 10,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      countryCode: true,
      mobileNumber: true,
      service: true,
      remark: true,
      nextFollowupAt: true,
    },
  });

  if (args.markNotified && leads.length > 0) {
    await prisma.lead.updateMany({
      where: {
        id: { in: leads.map((lead) => lead.id) },
        ownerAdminId: args.ownerAdminId,
      },
      data: { followupNotified: true },
    });
  }

  return leads.map(mapFollowupReminder);
}

export async function listDueFollowupRemindersForSocket(ownerAdminId: string, userId: string) {
  const now = new Date();
  const leads = await prisma.lead.findMany({
    where: {
      ...leadCreatorWhere(ownerAdminId, userId),
      nextFollowupAt: { lte: now },
      followupCompleted: false,
      followupNotified: false,
      NOT: [
        { followupStatus: FollowupStatus.Completed },
        { leadStatus: { in: [LeadStatus.Closed, LeadStatus.LOB] } },
      ],
    },
    orderBy: [{ nextFollowupAt: "asc" }, { updatedAt: "desc" }],
    take: 25,
    select: {
      id: true,
      ownerAdminId: true,
      assignedUserId: true,
      createdById: true,
      firstName: true,
      lastName: true,
      countryCode: true,
      mobileNumber: true,
      service: true,
      remark: true,
      nextFollowupAt: true,
    },
  });

  return leads.map((lead) => ({
    ownerAdminId: lead.ownerAdminId,
    assignedUserId: lead.assignedUserId,
    createdById: lead.createdById,
    payload: mapFollowupReminder(lead),
  }));
}

export async function completeFollowup(args: {
  ownerAdminId: string;
  userId: string;
  leadId: string;
  completionDescription: string;
  completionNote?: string;
  changedBy?: string;
}) {
  const lockState = await getUserLockState(args.userId);
  if (lockState?.isLocked) {
    throw new Error(lockState.lockReason ?? FOLLOWUP_LOCK_MESSAGE);
  }

  const lead = await prisma.lead.findFirst({
    where: {
      id: args.leadId,
      ...userCanReceiveFollowup(args),
    },
    select: { id: true, nextFollowupAt: true },
  });

  if (!lead) {
    return null;
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  if (lead.nextFollowupAt && lead.nextFollowupAt < todayStart) {
    throw new Error("This follow-up is overdue and locked pending supervisor approval.");
  }

  return completeFollowupWithDescription({
    ownerAdminId: args.ownerAdminId,
    userId: args.userId,
    leadId: lead.id,
    completionDescription: args.completionDescription,
    completionNote: args.completionNote,
    changedByUserId: args.userId,
    changedBy: args.changedBy,
  });
}

export async function snoozeFollowup(args: {
  ownerAdminId: string;
  userId: string;
  leadId: string;
  nextFollowupAt: Date;
  snoozeNote?: string;
  changedBy?: string;
}) {
  const lockState = await getUserLockState(args.userId);
  if (lockState?.isLocked) {
    throw new Error(lockState.lockReason ?? FOLLOWUP_LOCK_MESSAGE);
  }

  const lead = await prisma.lead.findFirst({
    where: {
      id: args.leadId,
      ...userCanReceiveFollowup(args),
    },
    select: { id: true, nextFollowupAt: true },
  });

  if (!lead) {
    return null;
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  if (lead.nextFollowupAt && lead.nextFollowupAt < todayStart) {
    throw new Error("This follow-up is overdue and locked pending supervisor approval.");
  }

  return snoozeFollowupWithHistory({
    ownerAdminId: args.ownerAdminId,
    userId: args.userId,
    leadId: lead.id,
    nextFollowupAt: args.nextFollowupAt,
    description: args.snoozeNote?.trim() || "Follow-up reminder snoozed.",
    snoozeNote: args.snoozeNote,
    changedByUserId: args.userId,
    changedBy: args.changedBy,
  });
}

export async function requestMoveFollowupToLob(args: {
  ownerAdminId: string;
  userId: string;
  leadId: string;
}) {
  const lockState = await getUserLockState(args.userId);
  if (lockState?.isLocked) {
    throw new Error(lockState.lockReason ?? FOLLOWUP_LOCK_MESSAGE);
  }

  const lead = await prisma.lead.findFirst({
    where: {
      id: args.leadId,
      ...leadCreatorWhere(args.ownerAdminId, args.userId),
      leadStatus: { notIn: [LeadStatus.Closed, LeadStatus.LOB] },
    },
    select: {
      id: true,
      leadStatus: true,
    },
  });

  if (!lead) {
    return null;
  }

  const { createLobWorkflowRequest } = await import("./workflow-approval.service");
  return createLobWorkflowRequest({
    ownerAdminId: args.ownerAdminId,
    leadId: lead.id,
    requestedBy: args.userId,
  });
}

export async function getLobSummary(ownerAdminId: string, officeLocationId?: string): Promise<LobResponse> {
  const grouped = await prisma.lead.groupBy({
    by: ["service", "leadStatus"],
    where: {
      ownerAdminId,
      ...(officeLocationId ? { creator: { officeLocationId } } : {}),
    },
    _count: { _all: true },
    _sum: { amount: true },
  });

  const summary = new Map<
    string,
    { service: string; leadCount: number; activeLeads: number; closedLeads: number; totalRevenue: number }
  >();

  for (const item of grouped) {
    const current = summary.get(item.service) ?? {
      service: item.service,
      leadCount: 0,
      activeLeads: 0,
      closedLeads: 0,
      totalRevenue: 0,
    };

    current.leadCount += item._count._all;

    if (isClosedLeadStatus(item.leadStatus)) {
      current.closedLeads += item._count._all;
      current.totalRevenue += Number(item._sum.amount ?? 0);
    } else {
      current.activeLeads += item._count._all;
    }

    summary.set(item.service, current);
  }

  return {
    items: Array.from(summary.values()).sort((left, right) => right.leadCount - left.leadCount),
  };
}

async function listApprovedClosedRegistrationRevenue(ownerAdminId: string) {
  const registrations = await prisma.registration.findMany({
    where: {
      ownerAdminId,
      lead: {
        leadStatus: LeadStatus.Closed,
      },
    },
    select: {
      id: true,
      createdAt: true,
      totalCharges: true,
      advancePaid: true,
      balanceAmount: true,
      leadId: true,
      trackingNumber: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return registrations.map(reg => ({
    credit: reg.totalCharges,
    date: reg.createdAt,
    createdAt: reg.createdAt,
    trackingNumber: reg.trackingNumber,
  }));
}

export async function getDashboardStats(ownerAdminId: string): Promise<DashboardStatsResponse> {
  const revenueWindowStart = new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1);
  const [totalLeads, activeLeads, closedLeads, pendingLeads] = await Promise.all([
    prisma.lead.count({ where: { ownerAdminId } }),
    prisma.lead.count({
      where: {
        ownerAdminId,
        NOT: { leadStatus: LeadStatus.Closed },
      },
    }),
    prisma.lead.count({ where: { ownerAdminId, leadStatus: LeadStatus.Closed } }),
    getOwnerApprovalRequestCount(ownerAdminId),
  ]);

  let followups = 0;
  let recentLeads: LeadRow[] = [];
  let recentActivities: DashboardStatsResponse["recentActivities"] = [];
  let statusCounts: Array<{ leadStatus: LeadStatus; _count: { _all: number } }> = [];

  const monthLabels = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(new Date().getFullYear(), new Date().getMonth() - (5 - index), 1);
    return {
      key: startOfMonth(date).toISOString(),
      month: new Intl.DateTimeFormat("en-US", { month: "short" }).format(date),
    };
  });

  const monthlyLeadsMap = new Map<string, number>();
  const followupMap = new Map<string, number>();

  try {
    const [rawFollowups, recentLeadRecords, recentFollowupRecords, rawStatusCounts, monthlyCounts] =
      await Promise.all([
        prisma.lead.count({
          where: {
            ownerAdminId,
            nextFollowupAt: { not: null },
            NOT: { followupStatus: FollowupStatus.Completed },
          },
        }),
        prisma.lead.findMany({
          where: { ownerAdminId },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: leadSelect,
        }),
        prisma.lead.findMany({
          where: {
            ownerAdminId,
            nextFollowupAt: { not: null },
          },
          orderBy: [{ nextFollowupAt: "asc" }, { updatedAt: "desc" }],
          take: 5,
          select: leadSelect,
        }),
        prisma.lead.groupBy({
          by: ["leadStatus"],
          where: { ownerAdminId },
          _count: { _all: true },
        }),
        Promise.all(
          monthLabels.map(async (item) => {
            const start = new Date(item.key);
            const end = new Date(start);
            end.setMonth(end.getMonth() + 1);

            const [createdCount, followupCount] = await Promise.all([
              prisma.lead.count({
                where: { ownerAdminId, createdAt: { gte: start, lt: end } },
              }),
              prisma.lead.count({
                where: { ownerAdminId, nextFollowupAt: { gte: start, lt: end } },
              }),
            ]);

            return { key: item.key, createdCount, followupCount };
          })
        ),
      ]);

    followups = rawFollowups;
    recentLeads = recentLeadRecords.map(mapLeadRow);
    recentActivities = recentFollowupRecords.map((lead) => ({
      title: `${[lead.firstName, lead.lastName].filter(Boolean).join(" ")} followup`,
      time: lead.nextFollowupAt ? formatRelativeTime(lead.nextFollowupAt) : formatRelativeTime(lead.createdAt),
      detail: `${lead.service} lead is in ${formatLeadStatus(lead.leadStatus)} status for ${lead.country}.`,
    }));
    statusCounts = rawStatusCounts;

    for (const result of monthlyCounts) {
      monthlyLeadsMap.set(result.key, result.createdCount);
      followupMap.set(result.key, result.followupCount);
    }
  } catch (error) {
    if (!isMissingFollowupSchemaError(error)) {
      throw error;
    }

    const [rawFollowups, recentLeadRecords, recentFollowupRecords, rawStatusCounts, monthlyCounts] =
      await Promise.all([
        prisma.lead.count({
          where: {
            ownerAdminId,
            nextFollowupAt: { not: null },
          },
        }),
        prisma.lead.findMany({
          where: { ownerAdminId },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: legacyLeadSelect,
        }),
        prisma.lead.findMany({
          where: {
            ownerAdminId,
            nextFollowupAt: { not: null },
          },
          orderBy: [{ nextFollowupAt: "asc" }, { updatedAt: "desc" }],
          take: 5,
          select: legacyLeadSelect,
        }),
        prisma.lead.groupBy({
          by: ["leadStatus"],
          where: { ownerAdminId },
          _count: { _all: true },
        }),
        Promise.all(
          monthLabels.map(async (item) => {
            const start = new Date(item.key);
            const end = new Date(start);
            end.setMonth(end.getMonth() + 1);

            const [createdCount, followupCount] = await Promise.all([
              prisma.lead.count({
                where: { ownerAdminId, createdAt: { gte: start, lt: end } },
              }),
              prisma.lead.count({
                where: { ownerAdminId, nextFollowupAt: { gte: start, lt: end } },
              }),
            ]);

            return { key: item.key, createdCount, followupCount };
          })
        ),
      ]);

    followups = rawFollowups;
    recentLeads = recentLeadRecords.map(mapLegacyLeadRow);
    recentActivities = recentFollowupRecords.map((lead) => ({
      title: `${[lead.firstName, lead.lastName].filter(Boolean).join(" ")} followup`,
      time: lead.nextFollowupAt ? formatRelativeTime(lead.nextFollowupAt) : formatRelativeTime(lead.createdAt),
      detail: `${lead.service} lead is in ${formatLeadStatus(lead.leadStatus)} status for ${lead.country}.`,
    }));
    statusCounts = rawStatusCounts;

    for (const result of monthlyCounts) {
      monthlyLeadsMap.set(result.key, result.createdCount);
      followupMap.set(result.key, result.followupCount);
    }
  }

  const approvedRevenueRecords = await listApprovedClosedRegistrationRevenue(ownerAdminId);
  const totalRevenue = approvedRevenueRecords.reduce((sum, item) => sum + Number(item.credit), 0);
  const statusTotal = totalLeads || 1;
  const revenueMap = new Map(monthLabels.map((item) => [item.key, 0]));

  for (const registration of approvedRevenueRecords) {
    const revenueDate = registration.date ?? registration.createdAt;
    if (revenueDate < revenueWindowStart) {
      continue;
    }

    const monthKey = startOfMonth(revenueDate).toISOString();

    if (revenueMap.has(monthKey)) {
      revenueMap.set(monthKey, (revenueMap.get(monthKey) ?? 0) + Number(registration.credit));
    }
  }

  const advanceStats = await getAdvancePaymentStats(ownerAdminId).catch(() => ({
    pendingAdvanceApprovals: 0,
    approvedAdvances: 0,
    rejectedAdvances: 0,
    totalAdvanceAmount: 0,
    approvedAdvanceAmount: 0,
  }));

  return {
    totalLeads,
    activeLeads,
    closedLeads,
    pendingLeads,
    totalRevenue,
    followups,
    ...advanceStats,
    recentLeads,
    recentActivities,
    charts: {
      monthlyLeads: monthLabels.map((item) => ({
        month: item.month,
        value: monthlyLeadsMap.get(item.key) ?? 0,
      })),
      revenueTrends: monthLabels.map((item) => ({
        month: item.month,
        value: revenueMap.get(item.key) ?? 0,
      })),
      leadsByStatus: statusCounts.map((item) => ({
        label: formatLeadStatus(item.leadStatus),
        value: item._count._all,
        rate: `${Math.round((item._count._all / statusTotal) * 100)}%`,
      })),
      followupCounts: monthLabels.map((item) => ({
        label: item.month,
        value: followupMap.get(item.key) ?? 0,
      })),
    },
  };
}
