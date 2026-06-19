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
  const expected = (expH ?? 9) * 60 + (expM ?? 0);
  return actual > expected;
}

const ATTENDANCE_NOT_READY_MESSAGE =
  "Attendance system is not set up yet. Database migrations need to be applied.";

/** Check if error is "table does not exist" (migration not run yet) */
function isTableMissingError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const code = String((err as { code?: unknown }).code ?? "");
  const message = String((err as { message?: unknown }).message ?? "");
  const meta = (err as { meta?: { table?: string; modelName?: string } }).meta;
  return (
    code === "P2021" ||
    code === "P2022" ||
    code === "42P01" ||
    code === "42704" ||
    message.includes("does not exist") ||
    message.includes("relation") ||
    message.includes("attendance_records") ||
    message.includes("attendance_settings") ||
    meta?.table?.includes("attendance") === true ||
    meta?.modelName?.includes("Attendance") === true
  );
}

export async function isAttendanceReady(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1 FROM "attendance_records" LIMIT 0`;
    return true;
  } catch (err) {
    if (isTableMissingError(err)) return false;
    console.error("[attendance] isAttendanceReady error:", err);
    throw err;
  }
}

async function assertUserBelongsToAdmin(userId: string, ownerAdminId: string): Promise<void> {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      OR: [{ ownerAdminId }, { id: ownerAdminId }],
      isActive: true,
    },
    select: { id: true },
  });

  if (!user) {
    throw new Error("Selected user is not in your workspace.");
  }
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

export async function getTodayAttendance(userId: string): Promise<AttendanceRecord | null> {
  try {
    const record = await prisma.attendanceRecord.findUnique({
      where: { userId_attendanceDate: { userId, attendanceDate: todayDate() } },
      include: userInclude,
    });
    return record ? mapRecord(record) : null;
  } catch (err) {
    if (isTableMissingError(err)) {
      console.warn("[attendance] attendance_records table not found. Run: npx prisma migrate dev");
      return null;
    }
    console.error("[attendance] getTodayAttendance error:", err);
    throw err;
  }
}

// ─── check-in ───────────────────────────────────────────────────────────────

export async function checkIn(
  userId: string,
  ownerAdminId: string,
  opts: { checkinTime?: string; checkinRemarks?: string },
): Promise<AttendanceRecord> {
  const checkinTime = opts.checkinTime ? new Date(opts.checkinTime) : new Date();

  // Determine status (Present or Late)
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

  const late = setting ? isLate(checkinTime, setting.expectedCheckinTime) : false;
  const status = late ? "Late" : "Present";

  try {
    const record = await prisma.attendanceRecord.upsert({
      where: { userId_attendanceDate: { userId, attendanceDate: todayDate() } },
      update: {}, // do NOT overwrite if already checked in
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
  } catch (err) {
    if (isTableMissingError(err)) {
      console.error("[attendance] attendance_records table not found. Run: npx prisma migrate deploy");
      throw new Error(ATTENDANCE_NOT_READY_MESSAGE);
    }
    console.error("[attendance] checkIn error:", err);
    throw err;
  }
}

// ─── check-out ──────────────────────────────────────────────────────────────

export async function checkOut(
  userId: string,
  opts: { checkoutTime?: string; dailySummary: string },
): Promise<AttendanceRecord> {
  try {
    const existing = await prisma.attendanceRecord.findUnique({
      where: { userId_attendanceDate: { userId, attendanceDate: todayDate() } },
      select: { id: true, checkinTime: true },
    });

    if (!existing) {
      throw new Error("No check-in record found for today. Please check in first.");
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
  } catch (err) {
    if (err instanceof Error && err.message.includes("check in first")) {
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

// ─── list records ─────────────────────────────────────────────────────────────

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
        include: userInclude,
      }),
      prisma.attendanceRecord.count({ where }),
    ]);

    return { records: records.map(mapRecord), total, page, limit };
  } catch (err) {
    if (isTableMissingError(err)) {
      console.warn("[attendance] attendance_records table not found. Run: npx prisma migrate dev");
      return { records: [], total: 0, page, limit };
    }
    console.error("[attendance] listAttendanceRecords error:", err);
    throw err;
  }
}

// ─── pending approval ────────────────────────────────────────────────────────

export async function listPendingApprovals(ownerAdminId: string) {
  try {
    const records = await prisma.attendanceRecord.findMany({
      where: { ownerAdminId, approvalStatus: "Pending" },
      orderBy: [{ attendanceDate: "desc" }],
      include: userInclude,
    });
    return records.map(mapRecord);
  } catch (err) {
    if (isTableMissingError(err)) {
      console.warn("[attendance] attendance_records table not found. Run: npx prisma migrate dev");
      return [];
    }
    console.error("[attendance] listPendingApprovals error:", err);
    throw err;
  }
}

// ─── approve ────────────────────────────────────────────────────────────────

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
    include: userInclude,
  });

  return mapRecord(updated);
}

// ─── reject ──────────────────────────────────────────────────────────────────

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
    include: userInclude,
  });

  return mapRecord(updated);
}

// ─── settings ────────────────────────────────────────────────────────────────

export async function getAttendanceSetting(userId: string): Promise<AttendanceSetting | null> {
  try {
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
    return settings.map((s) => ({
      id: s.id,
      userId: s.userId,
      userName: s.user.name ?? "Unknown",
      userEmail: s.user.email,
      expectedCheckinTime: s.expectedCheckinTime,
      expectedCheckoutTime: s.expectedCheckoutTime,
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
    const s = await prisma.attendanceSetting.upsert({
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
      id: s.id,
      userId: s.userId,
      userName: s.user.name ?? "Unknown",
      userEmail: s.user.email,
      expectedCheckinTime: s.expectedCheckinTime,
      expectedCheckoutTime: s.expectedCheckoutTime,
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

// ─── stats ───────────────────────────────────────────────────────────────────

export async function getAttendanceStats(
  ownerAdminId: string,
): Promise<AttendanceStats> {
  const today = todayDate();

  try {
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
  } catch (err) {
    if (isTableMissingError(err)) {
      console.warn("[attendance] attendance_records table not found. Run: npx prisma migrate dev");
      return { presentToday: 0, absentToday: 0, lateToday: 0, pendingApproval: 0, approvedToday: 0 };
    }
    console.error("[attendance] getAttendanceStats error:", err);
    throw err;
  }
}
