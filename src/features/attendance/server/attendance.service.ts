import { prisma } from "@/lib/prisma";
import type {
  AttendanceCalendarDetail,
  AttendanceCalendarResponse,
  AttendanceRecord,
  AttendanceSetting,
  AttendanceStats,
  AttendanceStatus,
  CalendarDisplayStatus,
} from "@/features/attendance/types/attendance.types";
import {
  ATTENDANCE_NOT_READY_MESSAGE,
  addDays,
  assertUserBelongsToAdmin,
  calcWorkingHours,
  eachDayInclusive,
  endOfDay,
  formatDate,
  formatDateTime,
  formatTime,
  isLate,
  isTableMissingError,
  isWeekend,
  monthBounds,
  startOfDay,
  todayDate,
  toIsoDate,
} from "@/features/attendance/server/attendance.shared";

const CALENDAR_COLORS: Record<CalendarDisplayStatus, string> = {
  Present: "#16a34a",
  Absent: "#dc2626",
  Late: "#f97316",
  "Half Day": "#eab308",
  "Approved Leave": "#2563eb",
  "Rejected Leave": "#6b7280",
  "Pending Leave": "#6366f1",
  Holiday: "#94a3b8",
};

type AttendanceDbRecord = {
  id: string;
  userId: string;
  attendanceDate: Date;
  checkinTime: Date | null;
  checkoutTime: Date | null;
  workingHours: unknown;
  status: AttendanceStatus;
  dailySummary: string | null;
  checkinRemarks: string | null;
  approvalStatus: AttendanceRecord["approvalStatus"];
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  leaveRequestId: string | null;
  leaveRequest: null | {
    id: string;
    leaveType: string;
    status: AttendanceRecord["leaveStatus"];
    reason: string;
  };
  user: {
    name: string | null;
    email: string;
    departmentRef: { name: string } | null;
    officeLocationRef: { officeName: string } | null;
  };
};

const attendanceUserInclude = {
  user: {
    select: {
      name: true,
      email: true,
      departmentRef: { select: { name: true } },
      officeLocationRef: { select: { officeName: true } },
    },
  },
  leaveRequest: {
    select: {
      id: true,
      leaveType: true,
      status: true,
      reason: true,
    },
  },
} as const;

function mapAttendanceRecord(record: AttendanceDbRecord): AttendanceRecord {
  return {
    id: record.id,
    userId: record.userId,
    userName: record.user.name ?? "Unknown",
    userEmail: record.user.email,
    department: record.user.departmentRef?.name ?? "-",
    officeLocation: record.user.officeLocationRef?.officeName ?? "-",
    attendanceDate: formatDate(record.attendanceDate),
    attendanceDateIso: toIsoDate(record.attendanceDate),
    checkinTime: formatTime(record.checkinTime),
    checkoutTime: formatTime(record.checkoutTime),
    workingHours: record.workingHours ? String(record.workingHours) : null,
    status: record.status,
    dailySummary: record.dailySummary,
    checkinRemarks: record.checkinRemarks,
    approvalStatus: record.approvalStatus,
    approvedBy: record.approvedBy,
    approvedAt: formatDateTime(record.approvedAt),
    rejectionReason: record.rejectionReason,
    leaveRequestId: record.leaveRequestId,
    leaveType: record.leaveRequest?.leaveType ?? null,
    leaveStatus: record.leaveRequest?.status ?? null,
    leaveReason: record.leaveRequest?.reason ?? null,
    createdAt: record.createdAt.toISOString(),
  };
}

function getCalendarStatus(args: {
  attendanceStatus: AttendanceStatus | null;
  leaveStatus: AttendanceRecord["leaveStatus"];
  date: Date;
}): CalendarDisplayStatus {
  if (args.attendanceStatus === "Present") return "Present";
  if (args.attendanceStatus === "Late") return "Late";
  if (args.attendanceStatus === "HalfDay") return "Half Day";
  if (args.attendanceStatus === "Leave" || args.leaveStatus === "Approved") return "Approved Leave";
  if (args.leaveStatus === "Pending") return "Pending Leave";
  if (args.leaveStatus === "Rejected") return "Rejected Leave";
  if (isWeekend(args.date)) return "Holiday";
  return "Absent";
}

function leavePriority(status: AttendanceRecord["leaveStatus"]): number {
  switch (status) {
    case "Approved":
      return 3;
    case "Pending":
      return 2;
    case "Rejected":
      return 1;
    default:
      return 0;
  }
}

export async function isAttendanceReady(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1 FROM "attendance_records" LIMIT 0`;
    await prisma.$queryRaw`SELECT 1 FROM "leave_requests" LIMIT 0`;
    return true;
  } catch (err) {
    if (isTableMissingError(err)) return false;
    console.error("[attendance] isAttendanceReady error:", err);
    throw err;
  }
}

export async function getTodayAttendance(userId: string): Promise<AttendanceRecord | null> {
  try {
    const record = await prisma.attendanceRecord.findUnique({
      where: { userId_attendanceDate: { userId, attendanceDate: todayDate() } },
      include: attendanceUserInclude,
    });
    return record ? mapAttendanceRecord(record as AttendanceDbRecord) : null;
  } catch (err) {
    if (isTableMissingError(err)) {
      console.warn("[attendance] attendance_records table not found. Run: npx prisma migrate dev");
      return null;
    }
    console.error("[attendance] getTodayAttendance error:", err);
    throw err;
  }
}

export async function checkIn(
  userId: string,
  ownerAdminId: string,
  opts: { checkinTime?: string; checkinRemarks?: string },
): Promise<AttendanceRecord> {
  const checkinTime = opts.checkinTime ? new Date(opts.checkinTime) : new Date();

  let setting: { expectedCheckinTime: string } | null = null;
  try {
    setting = await prisma.attendanceSetting.findUnique({
      where: { userId },
      select: { expectedCheckinTime: true },
    });
  } catch (err) {
    if (!isTableMissingError(err)) {
      console.error("[attendance] checkIn - attendanceSetting lookup error:", err);
    }
  }

  const existing = await prisma.attendanceRecord.findUnique({
    where: { userId_attendanceDate: { userId, attendanceDate: todayDate() } },
    include: attendanceUserInclude,
  });

  if (existing) {
    if (existing.status === "Leave") {
      throw new Error("Approved leave exists for today. Check-in is unavailable.");
    }
    return mapAttendanceRecord(existing as AttendanceDbRecord);
  }

  const status: AttendanceStatus = setting && isLate(checkinTime, setting.expectedCheckinTime) ? "Late" : "Present";

  try {
    const record = await prisma.attendanceRecord.create({
      data: {
        userId,
        attendanceDate: todayDate(),
        checkinTime,
        status,
        checkinRemarks: opts.checkinRemarks || null,
        ownerAdminId,
      },
      include: attendanceUserInclude,
    });

    return mapAttendanceRecord(record as AttendanceDbRecord);
  } catch (err) {
    if (isTableMissingError(err)) {
      console.error("[attendance] attendance_records table not found. Run: npx prisma migrate deploy");
      throw new Error(ATTENDANCE_NOT_READY_MESSAGE);
    }
    console.error("[attendance] checkIn error:", err);
    throw err;
  }
}

export async function checkOut(
  userId: string,
  opts: { checkoutTime?: string; dailySummary: string },
): Promise<AttendanceRecord> {
  try {
    const existing = await prisma.attendanceRecord.findUnique({
      where: { userId_attendanceDate: { userId, attendanceDate: todayDate() } },
      select: { id: true, checkinTime: true, status: true },
    });

    if (!existing) {
      throw new Error("No check-in record found for today. Please check in first.");
    }

    if (existing.status === "Leave") {
      throw new Error("Approved leave exists for today. Check-out is unavailable.");
    }

    const checkoutTime = opts.checkoutTime ? new Date(opts.checkoutTime) : new Date();
    const workingHours = existing.checkinTime ? calcWorkingHours(existing.checkinTime, checkoutTime) : null;

    const record = await prisma.attendanceRecord.update({
      where: { id: existing.id },
      data: {
        checkoutTime,
        dailySummary: opts.dailySummary,
        workingHours: workingHours ?? undefined,
      },
      include: attendanceUserInclude,
    });

    return mapAttendanceRecord(record as AttendanceDbRecord);
  } catch (err) {
    if (err instanceof Error && (err.message.includes("check in first") || err.message.includes("Check-out is unavailable"))) {
      throw err;
    }
    if (isTableMissingError(err)) {
      console.error("[attendance] attendance_records table not found. Run: npx prisma migrate deploy");
      throw new Error(ATTENDANCE_NOT_READY_MESSAGE);
    }
    console.error("[attendance] checkOut error:", err);
    throw err;
  }
}

export async function listAttendanceRecords(params: {
  userId: string;
  ownerAdminId: string;
  isSuperAdmin: boolean;
  canApprove: boolean;
  page?: number;
  limit?: number;
  filterUserId?: string;
}) {
  const { userId, ownerAdminId, isSuperAdmin, canApprove, page = 1, limit = 20, filterUserId } = params;
  const skip = (page - 1) * limit;

  const where =
    isSuperAdmin || canApprove
      ? { ownerAdminId, ...(filterUserId ? { userId: filterUserId } : {}) }
      : { userId };

  try {
    const [records, total] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where,
        orderBy: [{ attendanceDate: "desc" }],
        skip,
        take: limit,
        include: attendanceUserInclude,
      }),
      prisma.attendanceRecord.count({ where }),
    ]);

    return { records: records.map((record) => mapAttendanceRecord(record as AttendanceDbRecord)), total, page, limit };
  } catch (err) {
    if (isTableMissingError(err)) {
      console.warn("[attendance] attendance_records table not found. Run: npx prisma migrate dev");
      return { records: [], total: 0, page, limit };
    }
    console.error("[attendance] listAttendanceRecords error:", err);
    throw err;
  }
}

export async function listPendingApprovals(ownerAdminId: string) {
  try {
    const records = await prisma.attendanceRecord.findMany({
      where: { ownerAdminId, approvalStatus: "Pending" },
      orderBy: [{ attendanceDate: "desc" }],
      include: attendanceUserInclude,
    });
    return records.map((record) => mapAttendanceRecord(record as AttendanceDbRecord));
  } catch (err) {
    if (isTableMissingError(err)) {
      console.warn("[attendance] attendance_records table not found. Run: npx prisma migrate dev");
      return [];
    }
    console.error("[attendance] listPendingApprovals error:", err);
    throw err;
  }
}

export async function approveAttendance(
  recordId: string,
  ownerAdminId: string,
  approvedBy: string,
): Promise<AttendanceRecord> {
  const record = await prisma.attendanceRecord.findFirst({
    where: { id: recordId, ownerAdminId },
    select: { id: true },
  });

  if (!record) throw new Error("Attendance record not found.");

  const updated = await prisma.attendanceRecord.update({
    where: { id: recordId },
    data: {
      approvalStatus: "Approved",
      approvedBy,
      approvedAt: new Date(),
      rejectionReason: null,
    },
    include: attendanceUserInclude,
  });

  return mapAttendanceRecord(updated as AttendanceDbRecord);
}

export async function rejectAttendance(
  recordId: string,
  ownerAdminId: string,
  rejectionReason: string,
): Promise<AttendanceRecord> {
  const record = await prisma.attendanceRecord.findFirst({
    where: { id: recordId, ownerAdminId },
    select: { id: true },
  });

  if (!record) throw new Error("Attendance record not found.");

  const updated = await prisma.attendanceRecord.update({
    where: { id: recordId },
    data: {
      approvalStatus: "Rejected",
      rejectionReason,
      approvedBy: null,
      approvedAt: null,
    },
    include: attendanceUserInclude,
  });

  return mapAttendanceRecord(updated as AttendanceDbRecord);
}

export async function getAttendanceSetting(userId: string): Promise<AttendanceSetting | null> {
  try {
    const setting = await prisma.attendanceSetting.findUnique({
      where: { userId },
      include: { user: { select: { name: true, email: true } } },
    });
    if (!setting) return null;
    return {
      id: setting.id,
      userId: setting.userId,
      userName: setting.user.name ?? "Unknown",
      userEmail: setting.user.email,
      expectedCheckinTime: setting.expectedCheckinTime,
      expectedCheckoutTime: setting.expectedCheckoutTime,
    };
  } catch (err) {
    if (isTableMissingError(err)) {
      console.warn("[attendance] attendance_settings table not found. Run: npx prisma migrate dev");
      return null;
    }
    console.error("[attendance] getAttendanceSetting error:", err);
    throw err;
  }
}

export async function listAttendanceSettings(ownerAdminId: string): Promise<AttendanceSetting[]> {
  try {
    const settings = await prisma.attendanceSetting.findMany({
      where: { ownerAdminId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });
    return settings.map((setting) => ({
      id: setting.id,
      userId: setting.userId,
      userName: setting.user.name ?? "Unknown",
      userEmail: setting.user.email,
      expectedCheckinTime: setting.expectedCheckinTime,
      expectedCheckoutTime: setting.expectedCheckoutTime,
    }));
  } catch (err) {
    if (isTableMissingError(err)) {
      console.warn("[attendance] attendance_settings table not found. Run: npx prisma migrate dev");
      return [];
    }
    console.error("[attendance] listAttendanceSettings error:", err);
    throw err;
  }
}

export async function upsertAttendanceSetting(
  ownerAdminId: string,
  createdBy: string,
  payload: { userId: string; expectedCheckinTime: string; expectedCheckoutTime: string },
): Promise<AttendanceSetting> {
  await assertUserBelongsToAdmin(payload.userId, ownerAdminId);

  try {
    const setting = await prisma.attendanceSetting.upsert({
      where: { userId: payload.userId },
      update: {
        expectedCheckinTime: payload.expectedCheckinTime,
        expectedCheckoutTime: payload.expectedCheckoutTime,
        ownerAdminId,
      },
      create: {
        userId: payload.userId,
        expectedCheckinTime: payload.expectedCheckinTime,
        expectedCheckoutTime: payload.expectedCheckoutTime,
        ownerAdminId,
        createdBy,
      },
      include: { user: { select: { name: true, email: true } } },
    });
    return {
      id: setting.id,
      userId: setting.userId,
      userName: setting.user.name ?? "Unknown",
      userEmail: setting.user.email,
      expectedCheckinTime: setting.expectedCheckinTime,
      expectedCheckoutTime: setting.expectedCheckoutTime,
    };
  } catch (err) {
    if (isTableMissingError(err)) {
      console.error("[attendance] attendance_settings table not found. Run: npx prisma migrate deploy");
      throw new Error("Attendance settings table is missing. Run database migrations.");
    }
    console.error("[attendance] upsertAttendanceSetting error:", err);
    throw err;
  }
}

export async function getAttendanceStats(ownerAdminId: string): Promise<AttendanceStats> {
  const today = todayDate();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  try {
    const [presentToday, lateToday, onLeaveToday, pendingLeaveRequests, approvedLeavesThisMonth] = await Promise.all([
      prisma.attendanceRecord.count({ where: { ownerAdminId, attendanceDate: today, status: "Present" } }),
      prisma.attendanceRecord.count({ where: { ownerAdminId, attendanceDate: today, status: "Late" } }),
      prisma.attendanceRecord.count({ where: { ownerAdminId, attendanceDate: today, status: "Leave" } }),
      prisma.leaveRequest.count({ where: { ownerAdminId, status: "Pending" } }),
      prisma.leaveRequest.count({
        where: {
          ownerAdminId,
          status: "Approved",
          approvedAt: { gte: startOfDay(monthStart), lte: endOfDay(monthEnd) },
        },
      }),
    ]);

    const totalUsers = await prisma.user.count({
      where: {
        OR: [{ ownerAdminId }, { id: ownerAdminId }],
        isActive: true,
      },
    });
    const attendedOrOnLeave = await prisma.attendanceRecord.count({
      where: { ownerAdminId, attendanceDate: today },
    });
    const absentToday = Math.max(0, totalUsers - attendedOrOnLeave);

    return {
      presentToday,
      absentToday,
      onLeaveToday,
      lateToday,
      pendingLeaveRequests,
      approvedLeavesThisMonth,
    };
  } catch (err) {
    if (isTableMissingError(err)) {
      console.warn("[attendance] attendance or leave tables not found. Run: npx prisma migrate dev");
      return {
        presentToday: 0,
        absentToday: 0,
        onLeaveToday: 0,
        lateToday: 0,
        pendingLeaveRequests: 0,
        approvedLeavesThisMonth: 0,
      };
    }
    console.error("[attendance] getAttendanceStats error:", err);
    throw err;
  }
}

function resolveCalendarWindow(params: {
  month?: number;
  year?: number;
  from?: string;
  to?: string;
}) {
  if (
    typeof params.month === "number" &&
    Number.isInteger(params.month) &&
    params.month >= 1 &&
    params.month <= 12 &&
    typeof params.year === "number" &&
    Number.isInteger(params.year) &&
    params.year >= 1970
  ) {
    const bounds = monthBounds(params.year, params.month);
    return {
      month: params.month,
      year: params.year,
      from: bounds.start,
      to: bounds.end,
    };
  }

  if (params.from && params.to) {
    const from = startOfDay(params.from);
    const to = startOfDay(params.to);
    return {
      month: from.getMonth() + 1,
      year: from.getFullYear(),
      from,
      to,
    };
  }

  const today = todayDate();
  const bounds = monthBounds(today.getFullYear(), today.getMonth() + 1);
  return {
    month: today.getMonth() + 1,
    year: today.getFullYear(),
    from: bounds.start,
    to: bounds.end,
  };
}

function createEmptyCalendarResponse(month: number, year: number, from: Date, to: Date): AttendanceCalendarResponse {
  return {
    month,
    year,
    summary: {
      present: 0,
      absent: 0,
      late: 0,
      leave: 0,
    },
    days: [],
    totalUsers: 0,
    range: { from: toIsoDate(from), to: toIsoDate(to) },
  };
}

export async function getAttendanceCalendar(params: {
  currentUserId: string;
  ownerAdminId: string;
  isSuperAdmin: boolean;
  canViewAll: boolean;
  month?: number;
  year?: number;
  from?: string;
  to?: string;
  userId?: string;
  departmentId?: string;
  officeLocationId?: string;
}): Promise<AttendanceCalendarResponse> {
  const window = resolveCalendarWindow({
    month: params.month,
    year: params.year,
    from: params.from,
    to: params.to,
  });
  const from = window.from;
  const to = window.to;

  console.log("[attendance] getAttendanceCalendar request", {
    currentUserId: params.currentUserId,
    selectedUserId: params.userId ?? null,
    ownerAdminId: params.ownerAdminId,
    canViewAll: params.canViewAll || params.isSuperAdmin,
    departmentId: params.departmentId ?? null,
    officeLocationId: params.officeLocationId ?? null,
    month: window.month,
    year: window.year,
    from: toIsoDate(from),
    to: toIsoDate(to),
  });

  const userWhere = params.isSuperAdmin || params.canViewAll
    ? {
        OR: [{ ownerAdminId: params.ownerAdminId }, { id: params.ownerAdminId }],
        isActive: true,
        ...(params.userId ? { id: params.userId } : {}),
        ...(params.departmentId ? { departmentId: params.departmentId } : {}),
        ...(params.officeLocationId ? { officeLocationId: params.officeLocationId } : {}),
      }
    : {
        id: params.currentUserId,
        isActive: true,
      };

  const users = await prisma.user.findMany({
    where: userWhere,
    select: {
      id: true,
      name: true,
      email: true,
      supervisorRef: { select: { name: true, email: true } },
      departmentRef: { select: { name: true } },
      officeLocationRef: { select: { officeName: true } },
    },
    orderBy: { name: "asc" },
  });

  const userIds = users.map((user) => user.id);
  console.log("[attendance] getAttendanceCalendar users", { count: userIds.length, userIds });
  if (userIds.length === 0) {
    return createEmptyCalendarResponse(window.month, window.year, from, to);
  }

  const [records, leaveRequests] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: {
        userId: { in: userIds },
        attendanceDate: { gte: from, lte: to },
      },
      include: attendanceUserInclude,
    }),
    prisma.leaveRequest.findMany({
      where: {
        userId: { in: userIds },
        status: { in: ["Approved", "Pending", "Rejected"] },
        fromDate: { lte: to },
        toDate: { gte: from },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            departmentRef: { select: { name: true } },
            officeLocationRef: { select: { officeName: true } },
          },
        },
      },
      orderBy: [{ appliedAt: "desc" }],
    }),
  ]);

  console.log("[attendance] getAttendanceCalendar fetched", { attendanceRecords: records.length, leaveRequests: leaveRequests.length });

  const recordMap = new Map(records.map((record) => [`${record.userId}:${toIsoDate(record.attendanceDate)}`, record as AttendanceDbRecord]));
  const leaveMap = new Map<string, (typeof leaveRequests)[number]>();

  for (const leave of leaveRequests) {
    const leaveStart = leave.fromDate < from ? from : startOfDay(leave.fromDate);
    const leaveEnd = leave.toDate > to ? to : startOfDay(leave.toDate);
    for (const day of eachDayInclusive(leaveStart, leaveEnd)) {
      const key = `${leave.userId}:${toIsoDate(day)}`;
      const current = leaveMap.get(key);
      if (!current || leavePriority(leave.status) >= leavePriority(current.status)) {
        leaveMap.set(key, leave);
      }
    }
  }

  const days = eachDayInclusive(from, to).map((day) => {
    const details: AttendanceCalendarDetail[] = users.map((user) => {
      const key = `${user.id}:${toIsoDate(day)}`;
      const record = recordMap.get(key);
      const leave = leaveMap.get(key);
      const attendanceStatus = record?.status ?? null;
      const leaveStatus = record?.leaveRequest?.status ?? leave?.status ?? null;
      const status = getCalendarStatus({ attendanceStatus, leaveStatus, date: day });

      return {
        userId: user.id,
        userName: user.name ?? user.email,
        department: user.departmentRef?.name ?? "-",
        officeLocation: user.officeLocationRef?.officeName ?? "-",
        supervisor: user.supervisorRef?.name ?? null,
        date: toIsoDate(day),
        checkinTime: formatTime(record?.checkinTime),
        checkoutTime: formatTime(record?.checkoutTime),
        workingHours: record?.workingHours ? String(record.workingHours) : null,
        status,
        attendanceStatus,
        approvalStatus: record?.approvalStatus ?? null,
        leaveRequestId: record?.leaveRequestId ?? leave?.id ?? null,
        leaveType: record?.leaveRequest?.leaveType ?? leave?.leaveType ?? null,
        leaveStatus,
        leaveReason: record?.leaveRequest?.reason ?? leave?.reason ?? null,
        approvalNote: leave?.approvalNote ?? null,
        rejectionReason: leave?.rejectionReason ?? record?.rejectionReason ?? null,
        description:
          record?.dailySummary ??
          record?.checkinRemarks ??
          leave?.approvalNote ??
          leave?.reason ??
          leave?.rejectionReason ??
          null,
      };
    });

    const summaryCounts = new Map<CalendarDisplayStatus, number>();
    for (const detail of details) {
      summaryCounts.set(detail.status, (summaryCounts.get(detail.status) ?? 0) + 1);
    }

    const summaries = Array.from(summaryCounts.entries()).map(([status, count]) => ({
      status,
      count,
      color: CALENDAR_COLORS[status],
      label: `${count} ${status}`,
    }));

    return {
      date: toIsoDate(day),
      summaries,
      details,
    };
  });

  const summary = days.reduce(
    (acc, day) => {
      for (const detail of day.details) {
        if (detail.status === "Present") acc.present += 1;
        else if (detail.status === "Late") acc.late += 1;
        else if (detail.status === "Absent") acc.absent += 1;
        else if (detail.status === "Approved Leave") acc.leave += 1;
      }
      return acc;
    },
    { present: 0, absent: 0, late: 0, leave: 0 },
  );

  return {
    month: window.month,
    year: window.year,
    summary,
    days,
    totalUsers: users.length,
    range: { from: toIsoDate(from), to: toIsoDate(to) },
  };
}
