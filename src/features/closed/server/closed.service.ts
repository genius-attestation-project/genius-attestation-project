import { LeadStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type ClosedFilters = {
  dateFrom?: Date;
  dateTo?: Date;
  service?: string;
  assignedUser?: string;
  previousStatus?: string;
  country?: string;
  query?: string;
};

export type ClosedTrendInterval = "daily" | "weekly" | "monthly";

export type ClosedAnalyticsCards = {
  totalClosedLeads: number;
  todayClosedLeads: number;
  thisMonthClosedLeads: number;
  totalClosedRevenue: number;
  topClosingService: string;
  highestClosingCountry: string;
  filterOptions: {
    services: string[];
    assignedUsers: string[];
    countries: string[];
    previousStatuses: string[];
  };
};

export type ClosedLeadRow = {
  id: string;
  leadCode: string;
  clientName: string;
  mobile: string;
  email: string;
  service: string;
  country: string;
  amount: number;
  assignedUser: string;
  closedDate: string;
  previousStatus: string | null;
  createdDate: string;
};

export type ClosedTrendPoint = {
  date: string;
  label: string;
  count: number;
};

export type ClosedRevenuePoint = {
  date: string;
  label: string;
  revenue: number;
};

export type ClosedCharts = {
  statusToClosed: { name: string; count: number }[];
  serviceWise: { name: string; count: number }[];
};

export type ClosedTimelineEntry = {
  id: string;
  leadId: string;
  leadCode: string;
  clientName: string;
  previousStatus: string;
  newStatus: string;
  changedBy: string | null;
  createdAt: string;
  service: string;
  assignedUser: string;
  country: string;
};

type ClosedLeadSnapshot = Prisma.LeadGetPayload<{
  select: {
    id: true;
    leadCode: true;
    firstName: true;
    lastName: true;
    countryCode: true;
    mobileNumber: true;
    email: true;
    service: true;
    country: true;
    amount: true;
    assignedUser: true;
    createdAt: true;
    closedAt: true;
    statusHistory: {
      select: {
        id: true;
        previousStatus: true;
        newStatus: true;
        changedBy: true;
        createdAt: true;
      };
    };
  };
}>;

function formatLeadStatusLabel(status: LeadStatus | string): string {
  if (status === LeadStatus.Pending_Approval || status === "Pending_Approval") {
    return "Pending Approval";
  }

  if (status === LeadStatus.Potential_Qualified || status === "Potential_Qualified") {
    return "Potential Qualified";
  }

  return String(status);
}

function parsePreviousStatus(status?: string): LeadStatus | undefined {
  if (!status || status === "all") {
    return undefined;
  }

  const statusMap: Record<string, LeadStatus> = {
    New: LeadStatus.New,
    Followup: LeadStatus.Followup,
    Assigned: LeadStatus.Assigned,
    Qualified: LeadStatus.Qualified,
    Closed: LeadStatus.Closed,
    LOB: LeadStatus.LOB,
    "Pending Approval": LeadStatus.Pending_Approval,
    Pending_Approval: LeadStatus.Pending_Approval,
    "Potential Qualified": LeadStatus.Potential_Qualified,
    Potential_Qualified: LeadStatus.Potential_Qualified,
  };

  return statusMap[status];
}

function startOfDay(value: Date): Date {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(value: Date): Date {
  const next = startOfDay(value);
  next.setDate(next.getDate() + 1);
  return next;
}

function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function endOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth() + 1, 1);
}

function startOfWeek(value: Date): Date {
  const next = startOfDay(value);
  const day = next.getDay();
  const diff = day === 0 ? 6 : day - 1;
  next.setDate(next.getDate() - diff);
  return next;
}

function formatDateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function formatWeekKey(value: Date): string {
  return formatDateKey(startOfWeek(value));
}

function formatMonthKey(value: Date): string {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
}

function buildBaseClosedWhere(ownerAdminId: string, filters: ClosedFilters): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {
    ownerAdminId,
    leadStatus: LeadStatus.Closed,
  };

  if (filters.service) {
    where.service = filters.service;
  }

  if (filters.assignedUser) {
    where.assignedUser = { contains: filters.assignedUser, mode: "insensitive" };
  }

  if (filters.country) {
    where.country = { contains: filters.country, mode: "insensitive" };
  }

  if (filters.query?.trim()) {
    const query = filters.query.trim();
    where.OR = [
      { leadCode: { contains: query, mode: "insensitive" } },
      { firstName: { contains: query, mode: "insensitive" } },
      { lastName: { contains: query, mode: "insensitive" } },
      { mobileNumber: { contains: query, mode: "insensitive" } },
      { email: { contains: query, mode: "insensitive" } },
      { service: { contains: query, mode: "insensitive" } },
      { assignedUser: { contains: query, mode: "insensitive" } },
    ];
  }

  return where;
}

function buildHistoryRelationFilter(filters: ClosedFilters): Prisma.LeadStatusHistoryListRelationFilter | undefined {
  const previousStatus = parsePreviousStatus(filters.previousStatus);

  if (!filters.dateFrom && !filters.dateTo && !previousStatus) {
    return undefined;
  }

  return {
    some: {
      newStatus: LeadStatus.Closed,
      ...(previousStatus ? { previousStatus } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            createdAt: {
              ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo ? { lt: filters.dateTo } : {}),
            },
          }
        : {}),
    },
  };
}

function matchesLatestHistory(snapshot: ClosedLeadSnapshot, filters: ClosedFilters): boolean {
  const latestHistory = snapshot.statusHistory[0];

  if (!latestHistory) {
    return !filters.previousStatus && !filters.dateFrom && !filters.dateTo;
  }

  const previousStatus = parsePreviousStatus(filters.previousStatus);

  if (previousStatus && latestHistory.previousStatus !== previousStatus) {
    return false;
  }

  if (filters.dateFrom && latestHistory.createdAt < filters.dateFrom) {
    return false;
  }

  if (filters.dateTo && latestHistory.createdAt >= filters.dateTo) {
    return false;
  }

  return true;
}

async function listCurrentClosedSnapshots(
  ownerAdminId: string,
  filters: ClosedFilters = {},
): Promise<ClosedLeadSnapshot[]> {
  const where: Prisma.LeadWhereInput = {
    ...buildBaseClosedWhere(ownerAdminId, filters),
    ...(buildHistoryRelationFilter(filters) ? { statusHistory: buildHistoryRelationFilter(filters) } : {}),
  };

  const records = await prisma.lead.findMany({
    where,
    orderBy: [{ closedAt: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      leadCode: true,
      firstName: true,
      lastName: true,
      countryCode: true,
      mobileNumber: true,
      email: true,
      service: true,
      country: true,
      amount: true,
      assignedUser: true,
      createdAt: true,
      closedAt: true,
      statusHistory: {
        where: { newStatus: LeadStatus.Closed },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          previousStatus: true,
          newStatus: true,
          changedBy: true,
          createdAt: true,
        },
      },
    },
  });

  return records.filter((record) => matchesLatestHistory(record, filters));
}

function buildOptionList(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function buildTrendBuckets(interval: ClosedTrendInterval, now: Date) {
  if (interval === "monthly") {
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (11 - index), 1));
      return {
        key: formatMonthKey(date),
        label: new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(date),
      };
    });
  }

  if (interval === "weekly") {
    const currentWeek = startOfWeek(now);
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(currentWeek);
      date.setDate(currentWeek.getDate() - (11 - index) * 7);
      return {
        key: formatWeekKey(date),
        label: new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(date),
      };
    });
  }

  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (29 - index));
    return {
      key: formatDateKey(date),
      label: new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(date),
    };
  });
}

function getTrendKey(value: Date, interval: ClosedTrendInterval) {
  if (interval === "monthly") {
    return formatMonthKey(value);
  }

  if (interval === "weekly") {
    return formatWeekKey(value);
  }

  return formatDateKey(value);
}

export async function getClosedAnalyticsCards(
  ownerAdminId: string,
  filters: ClosedFilters = {},
): Promise<ClosedAnalyticsCards> {
  const now = new Date();
  const allCurrentClosedSnapshots = await listCurrentClosedSnapshots(ownerAdminId, {});
  const filteredSnapshots =
    filters.service ||
    filters.assignedUser ||
    filters.previousStatus ||
    filters.country ||
    filters.query ||
    filters.dateFrom ||
    filters.dateTo
      ? await listCurrentClosedSnapshots(ownerAdminId, filters)
      : allCurrentClosedSnapshots;

  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const totalClosedLeads = filteredSnapshots.length;
  const todayClosedLeads = filteredSnapshots.filter((snapshot) => {
    const closedDate = snapshot.statusHistory[0]?.createdAt ?? snapshot.closedAt;
    return Boolean(closedDate && closedDate >= todayStart && closedDate < todayEnd);
  }).length;
  const thisMonthClosedLeads = filteredSnapshots.filter((snapshot) => {
    const closedDate = snapshot.statusHistory[0]?.createdAt ?? snapshot.closedAt;
    return Boolean(closedDate && closedDate >= monthStart && closedDate < monthEnd);
  }).length;
  const totalClosedRevenue = filteredSnapshots.reduce((sum, snapshot) => sum + Number(snapshot.amount), 0);

  const serviceCounts = filteredSnapshots.reduce<Record<string, number>>((acc, snapshot) => {
    acc[snapshot.service] = (acc[snapshot.service] ?? 0) + 1;
    return acc;
  }, {});
  const countryCounts = filteredSnapshots.reduce<Record<string, number>>((acc, snapshot) => {
    acc[snapshot.country] = (acc[snapshot.country] ?? 0) + 1;
    return acc;
  }, {});

  return {
    totalClosedLeads,
    todayClosedLeads,
    thisMonthClosedLeads,
    totalClosedRevenue,
    topClosingService:
      Object.entries(serviceCounts).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "None",
    highestClosingCountry:
      Object.entries(countryCounts).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "None",
    filterOptions: {
      services: buildOptionList(allCurrentClosedSnapshots.map((snapshot) => snapshot.service)),
      assignedUsers: buildOptionList(allCurrentClosedSnapshots.map((snapshot) => snapshot.assignedUser)),
      countries: buildOptionList(allCurrentClosedSnapshots.map((snapshot) => snapshot.country)),
      previousStatuses: buildOptionList(
        allCurrentClosedSnapshots.map((snapshot) =>
          snapshot.statusHistory[0]
            ? formatLeadStatusLabel(snapshot.statusHistory[0].previousStatus)
            : undefined,
        ),
      ),
    },
  };
}

export async function getClosedLeadsTable(
  ownerAdminId: string,
  filters: ClosedFilters = {},
  page = 1,
  pageSize = 20,
): Promise<{ items: ClosedLeadRow[]; totalItems: number; totalPages: number; page: number }> {
  const rows = (await listCurrentClosedSnapshots(ownerAdminId, filters))
    .sort((left, right) => {
      const leftDate = left.statusHistory[0]?.createdAt ?? left.closedAt ?? left.createdAt;
      const rightDate = right.statusHistory[0]?.createdAt ?? right.closedAt ?? right.createdAt;
      return rightDate.getTime() - leftDate.getTime();
    })
    .map((snapshot) => ({
      id: snapshot.id,
      leadCode: snapshot.leadCode,
      clientName: [snapshot.firstName, snapshot.lastName].filter(Boolean).join(" "),
      mobile: `${snapshot.countryCode} ${snapshot.mobileNumber}`.trim(),
      email: snapshot.email,
      service: snapshot.service,
      country: snapshot.country,
      amount: Number(snapshot.amount),
      assignedUser: snapshot.assignedUser ?? "",
      closedDate: (snapshot.statusHistory[0]?.createdAt ?? snapshot.closedAt ?? snapshot.createdAt).toISOString(),
      previousStatus: snapshot.statusHistory[0]
        ? formatLeadStatusLabel(snapshot.statusHistory[0].previousStatus)
        : null,
      createdDate: snapshot.createdAt.toISOString(),
    }));

  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: rows.slice(start, start + pageSize),
    totalItems,
    totalPages,
    page: safePage,
  };
}

export async function getClosedTrends(
  ownerAdminId: string,
  filters: ClosedFilters = {},
  interval: ClosedTrendInterval = "daily",
): Promise<ClosedTrendPoint[]> {
  const snapshots = await listCurrentClosedSnapshots(ownerAdminId, filters);
  const now = new Date();
  const buckets = buildTrendBuckets(interval, now);
  const grouped = new Map(buckets.map((bucket) => [bucket.key, 0]));

  for (const snapshot of snapshots) {
    const closedDate = snapshot.statusHistory[0]?.createdAt ?? snapshot.closedAt;
    if (!closedDate) {
      continue;
    }

    const key = getTrendKey(closedDate, interval);
    if (grouped.has(key)) {
      grouped.set(key, (grouped.get(key) ?? 0) + 1);
    }
  }

  return buckets.map((bucket) => ({
    date: bucket.key,
    label: bucket.label,
    count: grouped.get(bucket.key) ?? 0,
  }));
}

export async function getClosedRevenue(
  ownerAdminId: string,
  filters: ClosedFilters = {},
  interval: ClosedTrendInterval = "monthly",
): Promise<ClosedRevenuePoint[]> {
  const snapshots = await listCurrentClosedSnapshots(ownerAdminId, filters);
  const now = new Date();
  const buckets = buildTrendBuckets(interval, now);
  const grouped = new Map(buckets.map((bucket) => [bucket.key, 0]));

  for (const snapshot of snapshots) {
    const closedDate = snapshot.statusHistory[0]?.createdAt ?? snapshot.closedAt;
    if (!closedDate) {
      continue;
    }

    const key = getTrendKey(closedDate, interval);
    if (grouped.has(key)) {
      grouped.set(key, (grouped.get(key) ?? 0) + Number(snapshot.amount));
    }
  }

  return buckets.map((bucket) => ({
    date: bucket.key,
    label: bucket.label,
    revenue: grouped.get(bucket.key) ?? 0,
  }));
}

export async function getClosedCharts(
  ownerAdminId: string,
  filters: ClosedFilters = {},
): Promise<ClosedCharts> {
  const snapshots = await listCurrentClosedSnapshots(ownerAdminId, filters);

  const statusCounts = new Map<string, number>();
  const serviceCounts = new Map<string, number>();

  for (const snapshot of snapshots) {
    const latestHistory = snapshot.statusHistory[0];
    if (latestHistory) {
      const label = formatLeadStatusLabel(latestHistory.previousStatus);
      statusCounts.set(label, (statusCounts.get(label) ?? 0) + 1);
    }

    serviceCounts.set(snapshot.service, (serviceCounts.get(snapshot.service) ?? 0) + 1);
  }

  return {
    statusToClosed: Array.from(statusCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count),
    serviceWise: Array.from(serviceCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count),
  };
}

export async function getClosedTimeline(
  ownerAdminId: string,
  filters: ClosedFilters = {},
  limit = 50,
): Promise<ClosedTimelineEntry[]> {
  const previousStatus = parsePreviousStatus(filters.previousStatus);
  const query = filters.query?.trim();

  const records = await prisma.leadStatusHistory.findMany({
    where: {
      ownerAdminId,
      newStatus: LeadStatus.Closed,
      ...(previousStatus ? { previousStatus } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            createdAt: {
              ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo ? { lt: filters.dateTo } : {}),
            },
          }
        : {}),
      lead: {
        ...(filters.service ? { service: filters.service } : {}),
        ...(filters.assignedUser
          ? { assignedUser: { contains: filters.assignedUser, mode: "insensitive" } }
          : {}),
        ...(filters.country ? { country: { contains: filters.country, mode: "insensitive" } } : {}),
        ...(query
          ? {
              OR: [
                { leadCode: { contains: query, mode: "insensitive" } },
                { firstName: { contains: query, mode: "insensitive" } },
                { lastName: { contains: query, mode: "insensitive" } },
                { mobileNumber: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
                { service: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      lead: {
        select: {
          leadCode: true,
          firstName: true,
          lastName: true,
          service: true,
          assignedUser: true,
          country: true,
        },
      },
    },
  });

  return records.map((record) => ({
    id: record.id,
    leadId: record.leadId,
    leadCode: record.lead.leadCode,
    clientName: [record.lead.firstName, record.lead.lastName].filter(Boolean).join(" "),
    previousStatus: formatLeadStatusLabel(record.previousStatus),
    newStatus: formatLeadStatusLabel(record.newStatus),
    changedBy: record.changedBy,
    createdAt: record.createdAt.toISOString(),
    service: record.lead.service,
    assignedUser: record.lead.assignedUser ?? "",
    country: record.lead.country,
  }));
}
