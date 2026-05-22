import { LeadStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type LobFilters = {
  dateFrom?: Date;
  dateTo?: Date;
  service?: string;
  assignedUser?: string;
  previousStatus?: string;
  country?: string;
  query?: string;
};

export type LobAnalyticsCards = {
  totalLobLeads: number;
  todayLobLeads: number;
  thisMonthLobLeads: number;
  mostLostService: string;
  lobConversionRate: number;
  recoveryPotential: number;
};

export type LobLeadRow = {
  id: string;
  leadCode: string;
  clientName: string;
  mobile: string;
  email: string;
  service: string;
  country: string;
  source: string;
  amount: number;
  assignedUser: string;
  lobDate: string;
  previousStatus: string | null;
};

export type LobStatusHistoryEntry = {
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
  source: string;
};

export type LobCharts = {
  statusToLob: { name: string; count: number }[];
  serviceWise: { name: string; count: number }[];
  countryWise: { name: string; count: number }[];
};

export type LobTrendInterval = "daily" | "weekly" | "monthly";

export type LobTrend = {
  label: string;
  date: string;
  count: number;
};

export type LobFilterOptions = {
  services: string[];
  assignedUsers: string[];
  countries: string[];
  previousStatuses: string[];
};

type LobLeadSnapshot = Prisma.LeadGetPayload<{
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
    source: true;
    amount: true;
    assignedUser: true;
    nextFollowupAt: true;
    updatedAt: true;
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

function formatMonthKey(value: Date): string {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatWeekKey(value: Date): string {
  return formatDateKey(startOfWeek(value));
}

function buildBaseLeadWhere(ownerAdminId: string, filters: LobFilters): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {
    ownerAdminId,
    leadStatus: LeadStatus.LOB,
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

function buildHistoryRelationFilter(filters: LobFilters): Prisma.LeadStatusHistoryListRelationFilter | undefined {
  const previousStatus = parsePreviousStatus(filters.previousStatus);

  if (!filters.dateFrom && !filters.dateTo && !previousStatus) {
    return undefined;
  }

  return {
    some: {
      newStatus: LeadStatus.LOB,
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

function matchesLatestHistory(snapshot: LobLeadSnapshot, filters: LobFilters): boolean {
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

async function listCurrentLobSnapshots(
  ownerAdminId: string,
  filters: LobFilters = {},
): Promise<LobLeadSnapshot[]> {
  const where: Prisma.LeadWhereInput = {
    ...buildBaseLeadWhere(ownerAdminId, filters),
    ...(buildHistoryRelationFilter(filters) ? { statusHistory: buildHistoryRelationFilter(filters) } : {}),
  };

  const records = await prisma.lead.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
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
      source: true,
      amount: true,
      assignedUser: true,
      nextFollowupAt: true,
      updatedAt: true,
      statusHistory: {
        where: { newStatus: LeadStatus.LOB },
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

function buildLobLeadRow(snapshot: LobLeadSnapshot): LobLeadRow {
  const latestHistory = snapshot.statusHistory[0];

  return {
    id: snapshot.id,
    leadCode: snapshot.leadCode,
    clientName: [snapshot.firstName, snapshot.lastName].filter(Boolean).join(" "),
    mobile: `${snapshot.countryCode} ${snapshot.mobileNumber}`.trim(),
    email: snapshot.email,
    service: snapshot.service,
    country: snapshot.country,
    source: snapshot.source ?? "",
    amount: Number(snapshot.amount),
    assignedUser: snapshot.assignedUser ?? "",
    lobDate: (latestHistory?.createdAt ?? snapshot.updatedAt).toISOString(),
    previousStatus: latestHistory ? formatLeadStatusLabel(latestHistory.previousStatus) : null,
  };
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

function buildTrendBuckets(interval: LobTrendInterval, now: Date) {
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

function getTrendKey(value: Date, interval: LobTrendInterval) {
  if (interval === "monthly") {
    return formatMonthKey(value);
  }

  if (interval === "weekly") {
    return formatWeekKey(value);
  }

  return formatDateKey(value);
}

export async function getLobAnalyticsCards(
  ownerAdminId: string,
  filters: LobFilters = {},
): Promise<LobAnalyticsCards & { filterOptions: LobFilterOptions }> {
  const now = new Date();
  const allCurrentLobSnapshots = await listCurrentLobSnapshots(ownerAdminId, {});
  const filteredSnapshots = filters.service || filters.assignedUser || filters.previousStatus || filters.country || filters.query || filters.dateFrom || filters.dateTo
    ? await listCurrentLobSnapshots(ownerAdminId, filters)
    : allCurrentLobSnapshots;

  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const totalLeadsWhere: Prisma.LeadWhereInput = {
    ownerAdminId,
    ...(filters.service ? { service: filters.service } : {}),
    ...(filters.assignedUser
      ? { assignedUser: { contains: filters.assignedUser, mode: "insensitive" } }
      : {}),
    ...(filters.country ? { country: { contains: filters.country, mode: "insensitive" } } : {}),
    ...(filters.query?.trim()
      ? {
          OR: [
            { leadCode: { contains: filters.query.trim(), mode: "insensitive" } },
            { firstName: { contains: filters.query.trim(), mode: "insensitive" } },
            { lastName: { contains: filters.query.trim(), mode: "insensitive" } },
            { mobileNumber: { contains: filters.query.trim(), mode: "insensitive" } },
            { email: { contains: filters.query.trim(), mode: "insensitive" } },
            { service: { contains: filters.query.trim(), mode: "insensitive" } },
            { assignedUser: { contains: filters.query.trim(), mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const totalLeads = await prisma.lead.count({ where: totalLeadsWhere });

  const serviceCounts = filteredSnapshots.reduce<Record<string, number>>((acc, snapshot) => {
    acc[snapshot.service] = (acc[snapshot.service] ?? 0) + 1;
    return acc;
  }, {});

  const totalLobLeads = filteredSnapshots.length;
  const todayLobLeads = filteredSnapshots.filter((snapshot) => {
    const latestHistory = snapshot.statusHistory[0];
    return latestHistory && latestHistory.createdAt >= todayStart && latestHistory.createdAt < todayEnd;
  }).length;
  const thisMonthLobLeads = filteredSnapshots.filter((snapshot) => {
    const latestHistory = snapshot.statusHistory[0];
    return latestHistory && latestHistory.createdAt >= monthStart && latestHistory.createdAt < monthEnd;
  }).length;
  const mostLostService =
    Object.entries(serviceCounts).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "None";
  const lobConversionRate = totalLeads > 0 ? Math.round((totalLobLeads / totalLeads) * 100) : 0;
  const recoveryPotential = filteredSnapshots.filter((snapshot) => {
    return Boolean(snapshot.nextFollowupAt && snapshot.nextFollowupAt >= now);
  }).length;

  return {
    totalLobLeads,
    todayLobLeads,
    thisMonthLobLeads,
    mostLostService,
    lobConversionRate,
    recoveryPotential,
    filterOptions: {
      services: buildOptionList(allCurrentLobSnapshots.map((snapshot) => snapshot.service)),
      assignedUsers: buildOptionList(allCurrentLobSnapshots.map((snapshot) => snapshot.assignedUser)),
      countries: buildOptionList(allCurrentLobSnapshots.map((snapshot) => snapshot.country)),
      previousStatuses: buildOptionList(
        allCurrentLobSnapshots.map((snapshot) =>
          snapshot.statusHistory[0]
            ? formatLeadStatusLabel(snapshot.statusHistory[0].previousStatus)
            : undefined,
        ),
      ),
    },
  };
}

export async function getLobLeadsTable(
  ownerAdminId: string,
  filters: LobFilters = {},
  page = 1,
  pageSize = 20,
): Promise<{ items: LobLeadRow[]; totalItems: number; totalPages: number; page: number }> {
  const snapshots = await listCurrentLobSnapshots(ownerAdminId, filters);
  const rows = snapshots
    .sort((left, right) => {
      const leftDate = left.statusHistory[0]?.createdAt ?? left.updatedAt;
      const rightDate = right.statusHistory[0]?.createdAt ?? right.updatedAt;
      return rightDate.getTime() - leftDate.getTime();
    })
    .map(buildLobLeadRow);

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

export async function getLobCharts(
  ownerAdminId: string,
  filters: LobFilters = {},
): Promise<LobCharts> {
  const snapshots = await listCurrentLobSnapshots(ownerAdminId, filters);

  const statusCounts = new Map<string, number>();
  const serviceCounts = new Map<string, number>();
  const countryCounts = new Map<string, number>();

  for (const snapshot of snapshots) {
    const latestHistory = snapshot.statusHistory[0];
    if (latestHistory) {
      const label = formatLeadStatusLabel(latestHistory.previousStatus);
      statusCounts.set(label, (statusCounts.get(label) ?? 0) + 1);
    }

    serviceCounts.set(snapshot.service, (serviceCounts.get(snapshot.service) ?? 0) + 1);
    countryCounts.set(snapshot.country, (countryCounts.get(snapshot.country) ?? 0) + 1);
  }

  return {
    statusToLob: Array.from(statusCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count),
    serviceWise: Array.from(serviceCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count),
    countryWise: Array.from(countryCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 10),
  };
}

export async function getLobTrends(
  ownerAdminId: string,
  filters: LobFilters = {},
  interval: LobTrendInterval = "daily",
): Promise<LobTrend[]> {
  const snapshots = await listCurrentLobSnapshots(ownerAdminId, filters);
  const now = new Date();
  const buckets = buildTrendBuckets(interval, now);
  const grouped = new Map(buckets.map((bucket) => [bucket.key, 0]));

  for (const snapshot of snapshots) {
    const latestHistory = snapshot.statusHistory[0];
    if (!latestHistory) {
      continue;
    }

    const key = getTrendKey(latestHistory.createdAt, interval);
    if (grouped.has(key)) {
      grouped.set(key, (grouped.get(key) ?? 0) + 1);
    }
  }

  return buckets.map((bucket) => ({
    label: bucket.label,
    date: bucket.key,
    count: grouped.get(bucket.key) ?? 0,
  }));
}

export async function getLobStatusHistory(
  ownerAdminId: string,
  filters: LobFilters = {},
  limit = 50,
): Promise<LobStatusHistoryEntry[]> {
  const previousStatus = parsePreviousStatus(filters.previousStatus);
  const query = filters.query?.trim();

  const records = await prisma.leadStatusHistory.findMany({
    where: {
      ownerAdminId,
      newStatus: LeadStatus.LOB,
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
                { assignedUser: { contains: query, mode: "insensitive" } },
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
          source: true,
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
    source: record.lead.source ?? "",
  }));
}
