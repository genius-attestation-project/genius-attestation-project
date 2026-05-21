import { LeadStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type {
  DashboardStatsResponse,
  LeadListResponse,
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
  assignedUser: true,
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

type LeadRecord = Prisma.LeadGetPayload<{
  select: typeof leadSelect;
}>;

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
  return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} ${
    diffDays >= 0 ? "from now" : "ago"
  }`;
}

function mapLeadRow(lead: LeadRecord): LeadRow {
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
    assignedUser: lead.assignedUser ?? "",
    createdDate: formatDate(lead.createdAt),
    remark: lead.remark ?? "",
    rawAmount: Number(lead.amount),
    nextFollowupAt: lead.nextFollowupAt ? lead.nextFollowupAt.toISOString() : null,
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
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getFollowupTone(status: LeadStatus, followupAt: Date, today: Date): FollowupTone {
  const todayStart = startOfDay(today);
  const followupStart = startOfDay(followupAt);

  if (status === LeadStatus.Closed) {
    return "completed";
  }

  if (followupStart < todayStart) {
    return "missed";
  }

  if (status === LeadStatus.Qualified || status === LeadStatus.Potential_Qualified) {
    return "qualified";
  }

  if (status === LeadStatus.New) {
    return "new";
  }

  return "upcoming";
}

function getFollowupColor(tone: FollowupTone) {
  const palette: Record<FollowupTone, string> = {
    new: "#2563eb",
    completed: "#16a34a",
    upcoming: "#ea580c",
    missed: "#dc2626",
    qualified: "#9333ea",
  };

  return palette[tone];
}

function getFollowupStatusLabel(tone: FollowupTone) {
  const labels: Record<FollowupTone, string> = {
    new: "New",
    completed: "Completed",
    upcoming: "Upcoming",
    missed: "Missed",
    qualified: "Qualified",
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
  const tone = getFollowupTone(lead.leadStatus, followupAt, today);
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
    isCompleted: lead.leadStatus === LeadStatus.Closed,
    whatsappLink: `https://wa.me/${phoneNumber.replace(/[^\d]/g, "")}`,
    callLink: `tel:${phoneNumber}`,
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
    start: item.dateKey,
    allDay: true,
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

async function listScheduledFollowupRecords(ownerAdminId: string) {
  return prisma.lead.findMany({
    where: {
      ownerAdminId,
      nextFollowupAt: { not: null },
    },
    orderBy: [{ nextFollowupAt: "asc" }, { updatedAt: "desc" }],
    select: leadSelect,
  });
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildLeadData(input: LeadInput, leadCode?: string): Prisma.LeadUncheckedCreateInput {
  const amount =
    typeof input.amount === "number" ? new Prisma.Decimal(input.amount) : new Prisma.Decimal(0);
  const leadStatus = parseLeadStatus(input.leadStatus) ?? LeadStatus.New;

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
    amount,
    workingDays:
      typeof input.workingDays === "number" && input.workingDays > 0 ? input.workingDays : null,
    remark: input.remark || null,
    assignedUser: input.assignedUser || null,
    nextFollowupAt: input.nextFollowupAt ?? null,
    closedAt: leadStatus === LeadStatus.Closed ? new Date() : null,
  };
}

async function generateLeadCode() {
  const latestLead = await prisma.lead.findFirst({
    orderBy: { createdAt: "desc" },
    select: { leadCode: true },
  });

  const latestSequence = latestLead?.leadCode.match(/\d+$/)?.[0];
  const nextValue = latestSequence ? Number.parseInt(latestSequence, 10) + 1 : 1001;

  return `LD-${String(nextValue).padStart(4, "0")}`;
}

export async function listLeads(ownerAdminId: string, params: {
  page?: number;
  pageSize?: number;
  query?: string;
  status?: string;
}): Promise<LeadListResponse> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, Math.min(params.pageSize ?? 10, 100));
  const status = parseLeadStatus(params.status);
  const query = params.query?.trim();

  const where: Prisma.LeadWhereInput = {
    ownerAdminId,
    ...(status ? { leadStatus: status } : {}),
    ...(query
      ? {
          OR: [
            { leadCode: { contains: query, mode: "insensitive" } },
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { mobileNumber: { contains: query, mode: "insensitive" } },
            { service: { contains: query, mode: "insensitive" } },
            { assignedUser: { contains: query, mode: "insensitive" } },
            { country: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, totalItems] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: leadSelect,
    }),
    prisma.lead.count({ where }),
  ]);

  return {
    items: items.map(mapLeadRow),
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    },
  };
}

export async function getLeadById(ownerAdminId: string, id: string) {
  const lead = await prisma.lead.findFirst({
    where: {
      ownerAdminId,
      OR: [{ id }, { leadCode: id }],
    },
    select: leadSelect,
  });

  return lead ? mapLeadRow(lead) : null;
}

export async function createLead(ownerAdminId: string, input: LeadInput) {
  const leadCode = await generateLeadCode();
  const lead = await prisma.lead.create({
    data: { ...buildLeadData(input, leadCode), ownerAdminId },
    select: leadSelect,
  });

  return mapLeadRow(lead);
}

export async function updateLead(ownerAdminId: string, id: string, input: LeadInput) {
  const existingLead = await prisma.lead.findFirst({
    where: {
      ownerAdminId,
      OR: [{ id }, { leadCode: id }],
    },
    select: { id: true, leadCode: true },
  });

  if (!existingLead) {
    return null;
  }

  const lead = await prisma.lead.update({
    where: { id: existingLead.id },
    data: buildLeadData(input, existingLead.leadCode),
    select: leadSelect,
  });

  return mapLeadRow(lead);
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
  return listLeads(ownerAdminId, { status: "Closed", pageSize: 50 });
}

export async function listPendingLeads(ownerAdminId: string) {
  return listLeads(ownerAdminId, { status: "Pending Approval", pageSize: 50 });
}

export async function listFollowups(ownerAdminId: string) {
  const items = await prisma.lead.findMany({
    where: {
      ownerAdminId,
      OR: [{ leadStatus: LeadStatus.Followup }, { nextFollowupAt: { not: null } }],
    },
    orderBy: [{ nextFollowupAt: "asc" }, { updatedAt: "desc" }],
    take: 50,
    select: leadSelect,
  });

  return {
    items: items.map(mapLeadRow),
    pagination: {
      page: 1,
      pageSize: 50,
      totalItems: items.length,
      totalPages: 1,
    },
  };
}

export async function getFollowupCalendar(
  ownerAdminId: string,
  filter: FollowupFilter = "all",
): Promise<FollowupCalendarResponse> {
  const today = new Date();
  const records = await listScheduledFollowupRecords(ownerAdminId);
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
}

export async function getTodayFollowups(ownerAdminId: string): Promise<FollowupCalendarResponse> {
  return getFollowupCalendar(ownerAdminId, "today");
}

export async function getUpcomingFollowups(ownerAdminId: string): Promise<FollowupCalendarResponse> {
  return getFollowupCalendar(ownerAdminId, "upcoming");
}

export async function getFollowupsByDate(
  ownerAdminId: string,
  date: string,
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
  const records = await prisma.lead.findMany({
    where: {
      ownerAdminId,
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
}

export async function getLobSummary(ownerAdminId: string): Promise<LobResponse> {
  const grouped = await prisma.lead.groupBy({
    by: ["service", "leadStatus"],
    where: { ownerAdminId },
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
    current.totalRevenue += Number(item._sum.amount ?? 0);

    if (item.leadStatus === LeadStatus.Closed) {
      current.closedLeads += item._count._all;
    } else {
      current.activeLeads += item._count._all;
    }

    summary.set(item.service, current);
  }

  return {
    items: Array.from(summary.values()).sort((left, right) => right.leadCount - left.leadCount),
  };
}

export async function getDashboardStats(ownerAdminId: string): Promise<DashboardStatsResponse> {
  const [
    totalLeads,
    activeLeads,
    closedLeads,
    pendingLeads,
    followups,
    revenueAggregate,
    recentLeadRecords,
    recentFollowupRecords,
    statusCounts,
    monthlyLeadRecords,
  ] = await Promise.all([
    prisma.lead.count({ where: { ownerAdminId } }),
    prisma.lead.count({
      where: {
        ownerAdminId,
        NOT: { leadStatus: LeadStatus.Closed },
      },
    }),
    prisma.lead.count({ where: { ownerAdminId, leadStatus: LeadStatus.Closed } }),
    prisma.lead.count({ where: { ownerAdminId, leadStatus: LeadStatus.Pending_Approval } }),
    prisma.lead.count({ where: { ownerAdminId, leadStatus: LeadStatus.Followup } }),
    prisma.lead.aggregate({ where: { ownerAdminId }, _sum: { amount: true } }),
    prisma.lead.findMany({
      where: { ownerAdminId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: leadSelect,
    }),
    prisma.lead.findMany({
      where: {
        ownerAdminId,
        OR: [{ leadStatus: LeadStatus.Followup }, { nextFollowupAt: { not: null } }],
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
    prisma.lead.findMany({
      where: {
        ownerAdminId,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1),
        },
      },
      orderBy: { createdAt: "asc" },
      select: {
        createdAt: true,
        amount: true,
        leadStatus: true,
        nextFollowupAt: true,
      },
    }),
  ]);

  const recentLeads = recentLeadRecords.map(mapLeadRow);
  const statusTotal = totalLeads || 1;

  const monthLabels = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(new Date().getFullYear(), new Date().getMonth() - (5 - index), 1);
    return {
      key: startOfMonth(date).toISOString(),
      month: new Intl.DateTimeFormat("en-US", { month: "short" }).format(date),
    };
  });

  const monthlyLeadsMap = new Map(monthLabels.map((item) => [item.key, 0]));
  const revenueMap = new Map(monthLabels.map((item) => [item.key, 0]));
  const followupMap = new Map(monthLabels.map((item) => [item.key, 0]));

  for (const lead of monthlyLeadRecords) {
    const monthKey = startOfMonth(lead.createdAt).toISOString();

    if (monthlyLeadsMap.has(monthKey)) {
      monthlyLeadsMap.set(monthKey, (monthlyLeadsMap.get(monthKey) ?? 0) + 1);
      revenueMap.set(monthKey, (revenueMap.get(monthKey) ?? 0) + Number(lead.amount));
    }

    if (lead.nextFollowupAt) {
      const followupKey = startOfMonth(lead.nextFollowupAt).toISOString();

      if (followupMap.has(followupKey)) {
        followupMap.set(followupKey, (followupMap.get(followupKey) ?? 0) + 1);
      }
    }
  }

  return {
    totalLeads,
    activeLeads,
    closedLeads,
    pendingLeads,
    totalRevenue: Number(revenueAggregate._sum.amount ?? 0),
    followups,
    recentLeads,
    recentActivities: recentFollowupRecords.map((lead) => ({
      title: `${[lead.firstName, lead.lastName].filter(Boolean).join(" ")} followup`,
      time: lead.nextFollowupAt ? formatRelativeTime(lead.nextFollowupAt) : formatRelativeTime(lead.createdAt),
      detail: `${lead.service} lead is in ${formatLeadStatus(lead.leadStatus)} status for ${lead.country}.`,
    })),
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
