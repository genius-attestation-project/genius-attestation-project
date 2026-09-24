import { LeadStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type LobFilters = {
  dateFrom?: Date;
  dateTo?: Date;
  service?: string;
  assignedUser?: string;
  previousStatus?: string;
  country?: string;
  officeLocationId?: string;
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
  officeLocations: { label: string; value: string }[];
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

type LobLeadBase = Omit<LobLeadSnapshot, "statusHistory">;
type StatusHistoryRow = {
  id: string;
  lead_id: string;
  previous_status: LeadStatus;
  new_status: LeadStatus;
  changed_by: string | null;
  created_at: Date;
};

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

export function getLobLeadAllowedOfficeIds(user: any): string[] | null {
  if (!user || user.isSuperAdmin === true || user.allowedOfficeIds === null || user.allowedOfficeNames === null) {
    return null;
  }

  if (user.moduleOfficeVisibilities && typeof user.moduleOfficeVisibilities === "object") {
    const modConfig = user.moduleOfficeVisibilities["lead_management"];
    if (modConfig) {
      return Array.isArray(modConfig.officeIds) ? modConfig.officeIds : [];
    }
    return [];
  }

  if (Array.isArray(user.allowedOfficeIds)) {
    return user.allowedOfficeIds;
  }

  return [];
}

export function buildLobOfficeCondition(user: any, requestedOfficeId?: string): Prisma.LeadWhereInput {
  const allowedOfficeIds = getLobLeadAllowedOfficeIds(user);

  if (allowedOfficeIds === null) {
    if (requestedOfficeId?.trim()) {
      return { creator: { officeLocationId: requestedOfficeId.trim() } };
    }
    return {};
  }

  if (allowedOfficeIds.length === 0) {
    return { id: "none" };
  }

  if (requestedOfficeId?.trim()) {
    const target = requestedOfficeId.trim().toLowerCase();
    const isPermitted = allowedOfficeIds.some((id) => id.trim().toLowerCase() === target);
    if (!isPermitted) {
      return { id: "none" };
    }
    return { creator: { officeLocationId: requestedOfficeId.trim() } };
  }

  return { creator: { officeLocationId: { in: allowedOfficeIds } } };
}

function buildBaseLeadWhere(ownerAdminId: string, filters: LobFilters, user?: any): Prisma.LeadWhereInput {
  const officeCondition = buildLobOfficeCondition(user, filters.officeLocationId);
  const andConditions: Prisma.LeadWhereInput[] = [
    {
      ownerAdminId,
      leadStatus: LeadStatus.LOB,
    },
  ];

  if (Object.keys(officeCondition).length > 0) {
    andConditions.push(officeCondition);
  }

  if (filters.service) {
    andConditions.push({ service: filters.service });
  }

  if (filters.assignedUser) {
    andConditions.push({ assignedUser: { contains: filters.assignedUser } });
  }

  if (filters.country) {
    andConditions.push({ country: { contains: filters.country } });
  }

  if (filters.query?.trim()) {
    const query = filters.query.trim();
    andConditions.push({
      OR: [
        { leadCode: { contains: query } },
        { firstName: { contains: query } },
        { lastName: { contains: query } },
        { mobileNumber: { contains: query } },
        { email: { contains: query } },
        { service: { contains: query } },
        { assignedUser: { contains: query } },
      ],
    });
  }

  return andConditions.length === 1 ? andConditions[0] : { AND: andConditions };
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
  const lobDate = latestHistory?.createdAt ?? snapshot.updatedAt;

  if (!latestHistory) {
    if (filters.previousStatus) {
      return false;
    }

    if (filters.dateFrom && lobDate < filters.dateFrom) {
      return false;
    }

    if (filters.dateTo && lobDate >= filters.dateTo) {
      return false;
    }

    return true;
  }

  const previousStatus = parsePreviousStatus(filters.previousStatus);
  if (previousStatus && latestHistory.previousStatus !== previousStatus) {
    return false;
  }

  if (filters.dateFrom && lobDate < filters.dateFrom) {
    return false;
  }

  if (filters.dateTo && lobDate >= filters.dateTo) {
    return false;
  }

  return true;
}

async function listCurrentLobSnapshots(
  ownerAdminId: string,
  filters: LobFilters = {},
  user?: any,
): Promise<LobLeadSnapshot[]> {
  const where: Prisma.LeadWhereInput = {
    ...buildBaseLeadWhere(ownerAdminId, filters, user),
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
    },
  });

  const historiesByLeadId = new Map<string, LobLeadSnapshot["statusHistory"]>();

  if (records.length > 0) {
    const histories = await findStatusHistoryRows(records.map((record) => record.id), LeadStatus.LOB);

    for (const history of histories) {
      if (!historiesByLeadId.has(history.lead_id)) {
        historiesByLeadId.set(history.lead_id, [{
          id: history.id,
          previousStatus: history.previous_status,
          newStatus: history.new_status,
          changedBy: history.changed_by,
          createdAt: history.created_at,
        }]);
      }
    }
  }

  return (records as LobLeadBase[])
    .map((record) => ({
      ...record,
      statusHistory: historiesByLeadId.get(record.id) ?? [],
    }))
    .filter((record) => matchesLatestHistory(record, filters));
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

async function findStatusHistoryRows(
  leadIds: string[],
  newStatus: LeadStatus,
): Promise<StatusHistoryRow[]> {
  if (leadIds.length === 0) {
    return [];
  }

  return prisma.$queryRaw<StatusHistoryRow[]>(Prisma.sql`
    SELECT id, lead_id, previous_status, new_status, changed_by, created_at
    FROM lead_status_history
    WHERE lead_id IN (${Prisma.join(leadIds)})
      AND new_status = ${newStatus}
    ORDER BY created_at DESC
  `);
}

async function findTimelineRows(
  ownerAdminId: string,
  newStatus: LeadStatus,
  filters: LobFilters,
  limit: number,
): Promise<StatusHistoryRow[]> {
  const previousStatus = parsePreviousStatus(filters.previousStatus);
  const conditions: Prisma.Sql[] = [
    Prisma.sql`owner_admin_id = ${ownerAdminId}`,
    Prisma.sql`new_status = ${newStatus}`,
  ];

  if (previousStatus) {
    conditions.push(Prisma.sql`previous_status = ${previousStatus}`);
  }

  if (filters.dateFrom) {
    conditions.push(Prisma.sql`created_at >= ${filters.dateFrom}`);
  }

  if (filters.dateTo) {
    conditions.push(Prisma.sql`created_at < ${filters.dateTo}`);
  }

  return prisma.$queryRaw<StatusHistoryRow[]>(Prisma.sql`
    SELECT id, lead_id, previous_status, new_status, changed_by, created_at
    FROM lead_status_history
    WHERE ${Prisma.join(conditions, " AND ")}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `);
}

export async function getLobAnalyticsCards(
  ownerAdminId: string,
  filters: LobFilters = {},
  user?: any,
): Promise<LobAnalyticsCards & { filterOptions: LobFilterOptions }> {
  const now = new Date();
  const allCurrentLobSnapshots = await listCurrentLobSnapshots(ownerAdminId, {}, user);
  const filteredSnapshots = filters.service || filters.assignedUser || filters.previousStatus || filters.country || filters.officeLocationId || filters.query || filters.dateFrom || filters.dateTo
    ? await listCurrentLobSnapshots(ownerAdminId, filters, user)
    : allCurrentLobSnapshots;

  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const officeCondition = buildLobOfficeCondition(user, filters.officeLocationId);

  const andConditions: Prisma.LeadWhereInput[] = [{ ownerAdminId }];
  if (Object.keys(officeCondition).length > 0) {
    andConditions.push(officeCondition);
  }
  if (filters.service) {
    andConditions.push({ service: filters.service });
  }
  if (filters.assignedUser) {
    andConditions.push({ assignedUser: { contains: filters.assignedUser } });
  }
  if (filters.country) {
    andConditions.push({ country: { contains: filters.country } });
  }
  if (filters.query?.trim()) {
    const query = filters.query.trim();
    andConditions.push({
      OR: [
        { leadCode: { contains: query } },
        { firstName: { contains: query } },
        { lastName: { contains: query } },
        { mobileNumber: { contains: query } },
        { email: { contains: query } },
        { service: { contains: query } },
        { assignedUser: { contains: query } },
      ],
    });
  }

  const totalLeadsWhere: Prisma.LeadWhereInput =
    andConditions.length === 1 ? andConditions[0] : { AND: andConditions };

  const totalLeads = await prisma.lead.count({ where: totalLeadsWhere });

  const serviceCounts = filteredSnapshots.reduce<Record<string, number>>((acc, snapshot) => {
    acc[snapshot.service] = (acc[snapshot.service] ?? 0) + 1;
    return acc;
  }, {});

  const totalLobLeads = filteredSnapshots.length;
  const todayLobLeads = filteredSnapshots.filter((snapshot) => {
    const lobDate = snapshot.statusHistory[0]?.createdAt ?? snapshot.updatedAt;
    return lobDate >= todayStart && lobDate < todayEnd;
  }).length;
  const thisMonthLobLeads = filteredSnapshots.filter((snapshot) => {
    const lobDate = snapshot.statusHistory[0]?.createdAt ?? snapshot.updatedAt;
    return lobDate >= monthStart && lobDate < monthEnd;
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
      officeLocations: await getOfficeLocationOptions(ownerAdminId, user),
    },
  };
}

export async function getOfficeLocationOptions(ownerAdminId: string, user?: any) {
  const allowedOfficeIds = getLobLeadAllowedOfficeIds(user);

  if (allowedOfficeIds !== null && allowedOfficeIds.length === 0) {
    return [];
  }

  const users = await prisma.user.findMany({
    where: {
      OR: [{ ownerAdminId }, { id: ownerAdminId }],
      officeLocationId: { not: null },
      ...(allowedOfficeIds !== null ? { officeLocationId: { in: allowedOfficeIds } } : {}),
    },
    select: {
      officeLocationId: true,
      officeLocationName: true,
      officeLocationRef: {
        select: {
          officeName: true,
          location: true,
        },
      },
    },
  });

  const options = new Map<string, { label: string; value: string }>();
  for (const userRow of users) {
    if (!userRow.officeLocationId) continue;
    const label =
      userRow.officeLocationName?.trim() ||
      [userRow.officeLocationRef?.officeName, userRow.officeLocationRef?.location]
        .filter(Boolean)
        .join(" - ") ||
      userRow.officeLocationId;
    options.set(userRow.officeLocationId, { label, value: userRow.officeLocationId });
  }

  return Array.from(options.values()).sort((left, right) => left.label.localeCompare(right.label));
}

export async function getLobLeadsTable(
  ownerAdminId: string,
  filters: LobFilters = {},
  page = 1,
  pageSize = 20,
  user?: any,
): Promise<{ items: LobLeadRow[]; totalItems: number; totalPages: number; page: number }> {
  const snapshots = await listCurrentLobSnapshots(ownerAdminId, filters, user);
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
  user?: any,
): Promise<LobCharts> {
  const snapshots = await listCurrentLobSnapshots(ownerAdminId, filters, user);

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
  user?: any,
): Promise<LobTrend[]> {
  const snapshots = await listCurrentLobSnapshots(ownerAdminId, filters, user);
  const now = new Date();
  const buckets = buildTrendBuckets(interval, now);
  const grouped = new Map(buckets.map((bucket) => [bucket.key, 0]));

  for (const snapshot of snapshots) {
    const lobDate = snapshot.statusHistory[0]?.createdAt ?? snapshot.updatedAt;
    const key = getTrendKey(lobDate, interval);
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
  user?: any,
): Promise<LobStatusHistoryEntry[]> {
  const allowedOfficeIds = getLobLeadAllowedOfficeIds(user);
  if (allowedOfficeIds !== null && allowedOfficeIds.length === 0) {
    return [];
  }

  const officeCondition = buildLobOfficeCondition(user, filters.officeLocationId);
  const previousStatus = parsePreviousStatus(filters.previousStatus);
  const query = filters.query?.trim();

  const historyEntries = await prisma.leadStatusHistory.findMany({
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
        ownerAdminId,
        leadStatus: LeadStatus.LOB,
        ...(Object.keys(officeCondition).length > 0 ? officeCondition : {}),
        ...(filters.service ? { service: filters.service } : {}),
        ...(filters.assignedUser ? { assignedUser: { contains: filters.assignedUser } } : {}),
        ...(filters.country ? { country: { contains: filters.country } } : {}),
        ...(query
          ? {
              OR: [
                { leadCode: { contains: query } },
                { firstName: { contains: query } },
                { lastName: { contains: query } },
                { mobileNumber: { contains: query } },
                { email: { contains: query } },
                { service: { contains: query } },
                { assignedUser: { contains: query } },
              ],
            }
          : {}),
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      leadId: true,
      previousStatus: true,
      newStatus: true,
      changedBy: true,
      createdAt: true,
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

  return historyEntries.map((entry) => ({
    id: entry.id,
    leadId: entry.leadId,
    leadCode: entry.lead.leadCode ?? "Unknown",
    clientName: [entry.lead.firstName, entry.lead.lastName].filter(Boolean).join(" "),
    previousStatus: formatLeadStatusLabel(entry.previousStatus),
    newStatus: formatLeadStatusLabel(entry.newStatus),
    changedBy: entry.changedBy,
    createdAt: entry.createdAt.toISOString(),
    service: entry.lead.service ?? "",
    assignedUser: entry.lead.assignedUser ?? "",
    country: entry.lead.country ?? "",
    source: entry.lead.source ?? "",
  }));
}
