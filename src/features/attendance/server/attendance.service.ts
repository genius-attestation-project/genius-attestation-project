import { prisma } from "@/lib/prisma";
import type {
  AttendanceRecord,
  AttendanceSetting,
  AttendanceStats,
} from "@/features/attendance/types/attendance.types";

// ─── helpers ────────────────────────────────────────────────────────────────

function todayDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatTime(date: Date | null | undefined): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/** Returns working hours as a rounded decimal (e.g., 8.5) */
function calcWorkingHours(checkin: Date, checkout: Date): number {
  const ms = checkout.getTime() - checkin.getTime();
  return Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
}

/** Detect Late: compare actual time-of-day against expected HH:mm */
function isLate(checkinTime: Date, expectedTime: string): boolean {
  const [expH, expM] = expectedTime.split(":").map(Number);
  const actual = checkinTime.getHours() * 60 + checkinTime.getMinutes();
  const expected = expH * 60 + expM;
  return actual > expected;
}

type RawRecord = {
  id: string;
  userId: string;
  attendanceDate: Date;
  checkinTime: Date | null;
  checkoutTime: Date | null;
  workingHours: any;
  status: any;
  dailySummary: string | null;
  checkinRemarks: string | null;
  approvalStatus: any;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  user: {
    name: string | null;
    email: string;
    officeLocationRef: { officeName: string } | null;
  };
};

function mapRecord(r: RawRecord): AttendanceRecord {
  return {
    id: r.id,
    userId: r.userId,
    userName: r.user.name ?? "Unknown",
    userEmail: r.user.email,
    officeLocation: r.user.officeLocationRef?.officeName ?? "-",
    attendanceDate: formatDate(r.attendanceDate),
    checkinTime: formatTime(r.checkinTime),
    checkoutTime: formatTime(r.checkoutTime),
    workingHours: r.workingHours ? String(r.workingHours) : null,
    status: r.status as AttendanceRecord["status"],
    dailySummary: r.dailySummary,
    checkinRemarks: r.checkinRemarks,
    approvalStatus: r.approvalStatus as AttendanceRecord["approvalStatus"],
    approvedBy: r.approvedBy,
    approvedAt: r.approvedAt ? formatDate(r.approvedAt) : null,
    rejectionReason: r.rejectionReason,
    createdAt: r.createdAt.toISOString(),
  };
}

const userInclude = {
  user: {
    select: {
      name: true,
      email: true,
      officeLocationRef: { select: { officeName: true } },
    },
  },
} as const;

// ─── today ──────────────────────────────────────────────────────────────────

export async function getTodayAttendance(userId: string) {
  const record = await prisma.attendanceRecord.findUnique({
    where: { userId_attendanceDate: { userId, attendanceDate: todayDate() } },
    include: userInclude,
  });
  return record ? mapRecord(record) : null;
}

// ─── check-in ───────────────────────────────────────────────────────────────

export async function checkIn(
  userId: string,
  ownerAdminId: string,
  opts: { checkinTime?: string; checkinRemarks?: string },
) {
  const checkinTime = opts.checkinTime ? new Date(opts.checkinTime) : new Date();

  // Determine status (Present or Late)
  const setting = await prisma.attendanceSetting.findUnique({
    where: { userId },
    select: { expectedCheckinTime: true },
  });

  const late = setting ? isLate(checkinTime, setting.expectedCheckinTime) : false;
  const status = late ? "Late" : "Present";

  const record = await prisma.attendanceRecord.upsert({
    where: { userId_attendanceDate: { userId, attendanceDate: todayDate() } },
    update: {}, // do NOT overwrite if already exists
    create: {
      userId,
      attendanceDate: todayDate(),
      checkinTime,
      status,
      checkinRemarks: opts.checkinRemarks || null,
      ownerAdminId,
    },
    include: userInclude,
  });

  return mapRecord(record);
}

// ─── check-out ──────────────────────────────────────────────────────────────

export async function checkOut(
  userId: string,
  opts: { checkoutTime?: string; dailySummary: string },
) {
  const existing = await prisma.attendanceRecord.findUnique({
    where: { userId_attendanceDate: { userId, attendanceDate: todayDate() } },
    select: { id: true, checkinTime: true },
  });

  if (!existing) {
    throw new Error("No check-in record found for today.");
  }

  const checkoutTime = opts.checkoutTime ? new Date(opts.checkoutTime) : new Date();
  const workingHours =
    existing.checkinTime ? calcWorkingHours(existing.checkinTime, checkoutTime) : null;

  const record = await prisma.attendanceRecord.update({
    where: { id: existing.id },
    data: {
      checkoutTime,
      dailySummary: opts.dailySummary,
      workingHours: workingHours ?? undefined,
    },
    include: userInclude,
  });

  return mapRecord(record);
}

// ─── list records (own or admin) ─────────────────────────────────────────────

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

  // Admins with approval permission see all records under their workspace
  const where =
    isSuperAdmin || canApprove
      ? { ownerAdminId, ...(filterUserId ? { userId: filterUserId } : {}) }
      : { userId };

  const [records, total] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where,
      orderBy: [{ attendanceDate: "desc" }],
      skip,
      take: limit,
      include: userInclude,
    }),
    prisma.attendanceRecord.count({ where }),
  ]);

  return { records: records.map(mapRecord), total, page, limit };
}

// ─── pending approval ────────────────────────────────────────────────────────

export async function listPendingApprovals(ownerAdminId: string) {
  const records = await prisma.attendanceRecord.findMany({
    where: { ownerAdminId, approvalStatus: "Pending" },
    orderBy: [{ attendanceDate: "desc" }],
    include: userInclude,
  });
  return records.map(mapRecord);
}

// ─── approve ────────────────────────────────────────────────────────────────

export async function approveAttendance(
  recordId: string,
  ownerAdminId: string,
  approvedBy: string,
) {
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
    include: userInclude,
  });

  return mapRecord(updated);
}

// ─── reject ──────────────────────────────────────────────────────────────────

export async function rejectAttendance(
  recordId: string,
  ownerAdminId: string,
  rejectionReason: string,
) {
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
    include: userInclude,
  });

  return mapRecord(updated);
}

// ─── settings ────────────────────────────────────────────────────────────────

export async function getAttendanceSetting(userId: string): Promise<AttendanceSetting | null> {
  const s = await prisma.attendanceSetting.findUnique({
    where: { userId },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!s) return null;
  return {
    id: s.id,
    userId: s.userId,
    userName: s.user.name ?? "Unknown",
    userEmail: s.user.email,
    expectedCheckinTime: s.expectedCheckinTime,
    expectedCheckoutTime: s.expectedCheckoutTime,
  };
}

export async function listAttendanceSettings(ownerAdminId: string): Promise<AttendanceSetting[]> {
  const settings = await prisma.attendanceSetting.findMany({
    where: { ownerAdminId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  return settings.map((s) => ({
    id: s.id,
    userId: s.userId,
    userName: s.user.name ?? "Unknown",
    userEmail: s.user.email,
    expectedCheckinTime: s.expectedCheckinTime,
    expectedCheckoutTime: s.expectedCheckoutTime,
  }));
}

export async function upsertAttendanceSetting(
  ownerAdminId: string,
  createdBy: string,
  payload: { userId: string; expectedCheckinTime: string; expectedCheckoutTime: string },
) {
  const s = await prisma.attendanceSetting.upsert({
    where: { userId: payload.userId },
    update: {
      expectedCheckinTime: payload.expectedCheckinTime,
      expectedCheckoutTime: payload.expectedCheckoutTime,
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
    id: s.id,
    userId: s.userId,
    userName: s.user.name ?? "Unknown",
    userEmail: s.user.email,
    expectedCheckinTime: s.expectedCheckinTime,
    expectedCheckoutTime: s.expectedCheckoutTime,
  } as AttendanceSetting;
}

// ─── stats ───────────────────────────────────────────────────────────────────

export async function getAttendanceStats(
  ownerAdminId: string,
): Promise<AttendanceStats> {
  const today = todayDate();

  const [presentToday, lateToday, pendingApproval, approvedToday] =
    await Promise.all([
      prisma.attendanceRecord.count({
        where: { ownerAdminId, attendanceDate: today, status: "Present" },
      }),
      prisma.attendanceRecord.count({
        where: { ownerAdminId, attendanceDate: today, status: "Late" },
      }),
      prisma.attendanceRecord.count({
        where: { ownerAdminId, approvalStatus: "Pending" },
      }),
      prisma.attendanceRecord.count({
        where: { ownerAdminId, attendanceDate: today, approvalStatus: "Approved" },
      }),
    ]);

  // Absent = total active users under this admin - those who checked in today
  const totalUsers = await prisma.user.count({
    where: {
      OR: [{ ownerAdminId }, { id: ownerAdminId }],
      isActive: true,
    },
  });
  const checkedInToday = await prisma.attendanceRecord.count({
    where: { ownerAdminId, attendanceDate: today },
  });
  const absentToday = Math.max(0, totalUsers - checkedInToday);

  return { presentToday, absentToday, lateToday, pendingApproval, approvedToday };
}
