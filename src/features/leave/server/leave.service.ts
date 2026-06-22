import { prisma } from "@/lib/prisma";
import type { LeaveRequestRow } from "@/features/leave/types/leave.types";
import {
  assertUserBelongsToAdmin,
  eachDayInclusive,
  endOfDay,
  formatDate,
  formatDateTime,
  isTableMissingError,
  startOfDay,
  toIsoDate,
} from "@/features/attendance/server/attendance.shared";

function mapLeaveRow(leave: any): LeaveRequestRow {
  return {
    id: leave.id,
    userId: leave.userId,
    userName: leave.user?.name ?? "Unknown",
    userEmail: leave.user?.email ?? "",
    department: leave.user?.departmentRef?.name ?? "-",
    officeLocation: leave.user?.officeLocationRef?.officeName ?? "-",
    leaveType: leave.leaveType,
    fromDate: formatDate(leave.fromDate),
    toDate: formatDate(leave.toDate),
    fromDateIso: toIsoDate(leave.fromDate),
    toDateIso: toIsoDate(leave.toDate),
    totalDays: String(leave.totalDays),
    reason: leave.reason,
    attachmentUrl: leave.attachmentUrl,
    status: leave.status,
    approvalNote: leave.approvalNote,
    rejectionReason: leave.rejectionReason,
    appliedBy: leave.appliedBy,
    appliedAt: formatDateTime(leave.appliedAt) ?? "",
    approvedBy: leave.approvedBy,
    approvedAt: formatDateTime(leave.approvedAt),
    rejectedBy: leave.rejectedBy,
    rejectedAt: formatDateTime(leave.rejectedAt),
    cancelledBy: leave.cancelledBy,
    cancelledAt: formatDateTime(leave.cancelledAt),
    modifiedBy: leave.modifiedBy,
    modifiedAt: formatDateTime(leave.modifiedAt) ?? "",
  };
}

const leaveInclude = {
  user: {
    select: {
      name: true,
      email: true,
      departmentRef: { select: { name: true } },
      officeLocationRef: { select: { officeName: true } },
    },
  },
} as const;

function calculateTotalDays(fromDate: string, toDate: string, leaveType: string): number {
  const from = startOfDay(fromDate);
  const to = startOfDay(toDate);
  if (leaveType === "Half Day Leave") {
    if (toIsoDate(from) !== toIsoDate(to)) {
      throw new Error("Half Day Leave must be for a single day.");
    }
    return 0.5;
  }
  const diff = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
  return diff + 1;
}

async function assertNoLeaveConflicts(userId: string, fromDate: Date, toDate: Date, ignoreLeaveId?: string) {
  const overlappingLeave = await prisma.leaveRequest.findFirst({
    where: {
      userId,
      status: { in: ["Pending", "Approved"] },
      fromDate: { lte: toDate },
      toDate: { gte: fromDate },
      ...(ignoreLeaveId ? { id: { not: ignoreLeaveId } } : {}),
    },
    select: { id: true },
  });

  if (overlappingLeave) {
    throw new Error("A pending or approved leave request already exists in this date range.");
  }
}

async function assertNoAttendanceConflicts(userId: string, fromDate: Date, toDate: Date, ignoreLeaveId?: string) {
  const conflict = await prisma.attendanceRecord.findFirst({
    where: {
      userId,
      attendanceDate: { gte: fromDate, lte: toDate },
      OR: [
        { status: { in: ["Present", "Late", "HalfDay"] } },
        { checkinTime: { not: null } },
        { checkoutTime: { not: null } },
      ],
      ...(ignoreLeaveId ? { leaveRequestId: { not: ignoreLeaveId } } : {}),
    },
    select: { id: true },
  });

  if (conflict) {
    throw new Error("Attendance already exists for one or more selected leave dates.");
  }
}

async function createLeaveAttendanceRecords(args: {
  tx: any;
  leaveId: string;
  userId: string;
  ownerAdminId: string;
  fromDate: Date;
  toDate: Date;
}) {
  const dates = eachDayInclusive(args.fromDate, args.toDate);
  for (const date of dates) {
    await args.tx.attendanceRecord.upsert({
      where: { userId_attendanceDate: { userId: args.userId, attendanceDate: date } },
      update: {
        leaveRequestId: args.leaveId,
        status: "Leave",
        approvalStatus: "Approved",
        approvedAt: new Date(),
        rejectionReason: null,
      },
      create: {
        userId: args.userId,
        leaveRequestId: args.leaveId,
        attendanceDate: date,
        status: "Leave",
        approvalStatus: "Approved",
        approvedAt: new Date(),
        ownerAdminId: args.ownerAdminId,
      },
    });
  }
}

export async function applyLeaveRequest(args: {
  ownerAdminId: string;
  userId: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  reason: string;
  attachmentUrl: string | null;
}) {
  const fromDate = startOfDay(args.fromDate);
  const toDate = startOfDay(args.toDate);

  await assertUserBelongsToAdmin(args.userId, args.ownerAdminId);
  await assertNoLeaveConflicts(args.userId, fromDate, toDate);
  await assertNoAttendanceConflicts(args.userId, fromDate, toDate);

  const totalDays = calculateTotalDays(args.fromDate, args.toDate, args.leaveType);

  const leave = await prisma.leaveRequest.create({
    data: {
      userId: args.userId,
      leaveType: args.leaveType,
      fromDate,
      toDate,
      totalDays,
      reason: args.reason,
      attachmentUrl: args.attachmentUrl,
      status: "Pending",
      appliedBy: args.userId,
      modifiedBy: args.userId,
      ownerAdminId: args.ownerAdminId,
    },
    include: leaveInclude,
  });

  return mapLeaveRow(leave);
}

export async function listLeaveRequests(params: {
  ownerAdminId: string;
  userId: string;
  canViewAll: boolean;
  isSuperAdmin: boolean;
  filterUserId?: string;
  departmentId?: string;
  officeLocationId?: string;
  month?: number;
  year?: number;
  status?: string;
}) {
  const userFilter = params.isSuperAdmin || params.canViewAll ? params.filterUserId : params.userId;
  const monthStart = params.month && params.year ? new Date(params.year, params.month - 1, 1) : null;
  const monthEnd = params.month && params.year ? new Date(params.year, params.month, 0) : null;

  const rows = await prisma.leaveRequest.findMany({
    where: {
      ownerAdminId: params.ownerAdminId,
      ...(userFilter ? { userId: userFilter } : {}),
      ...(params.status ? { status: params.status as any } : {}),
      ...(monthStart && monthEnd
        ? {
            fromDate: { lte: endOfDay(monthEnd) },
            toDate: { gte: startOfDay(monthStart) },
          }
        : {}),
      ...(params.departmentId || params.officeLocationId
        ? {
            user: {
              ...(params.departmentId ? { departmentId: params.departmentId } : {}),
              ...(params.officeLocationId ? { officeLocationId: params.officeLocationId } : {}),
            },
          }
        : {}),
    },
    orderBy: [{ appliedAt: "desc" }],
    include: leaveInclude,
  });

  return rows.map(mapLeaveRow);
}

export async function listMyLeaveRequests(ownerAdminId: string, userId: string) {
  return listLeaveRequests({ ownerAdminId, userId, canViewAll: false, isSuperAdmin: false, filterUserId: userId });
}

export async function listPendingLeaveRequests(ownerAdminId: string) {
  const rows = await prisma.leaveRequest.findMany({
    where: { ownerAdminId, status: "Pending" },
    orderBy: [{ appliedAt: "desc" }],
    include: leaveInclude,
  });

  return rows.map(mapLeaveRow);
}

export async function approveLeaveRequest(args: {
  leaveId: string;
  ownerAdminId: string;
  approvedBy: string;
  note: string;
}) {
  const leave = await prisma.leaveRequest.findFirst({
    where: { id: args.leaveId, ownerAdminId: args.ownerAdminId },
    include: leaveInclude,
  });

  if (!leave) throw new Error("Leave request not found.");
  if (leave.status === "Cancelled") throw new Error("Cancelled leave requests cannot be approved.");
  if (leave.status === "Approved") return mapLeaveRow(leave);

  await assertNoAttendanceConflicts(leave.userId, leave.fromDate, leave.toDate, leave.id);

  const updated = await prisma.$transaction(async (tx) => {
    const saved = await tx.leaveRequest.update({
      where: { id: leave.id },
      data: {
        status: "Approved",
        approvalNote: args.note,
        approvedBy: args.approvedBy,
        approvedAt: new Date(),
        rejectedBy: null,
        rejectedAt: null,
        rejectionReason: null,
        cancelledBy: null,
        cancelledAt: null,
        modifiedBy: args.approvedBy,
      },
      include: leaveInclude,
    });

    await createLeaveAttendanceRecords({
      tx,
      leaveId: leave.id,
      userId: leave.userId,
      ownerAdminId: args.ownerAdminId,
      fromDate: leave.fromDate,
      toDate: leave.toDate,
    });

    return saved;
  });

  return mapLeaveRow(updated);
}

export async function rejectLeaveRequest(args: {
  leaveId: string;
  ownerAdminId: string;
  rejectedBy: string;
  note: string;
}) {
  const leave = await prisma.leaveRequest.findFirst({
    where: { id: args.leaveId, ownerAdminId: args.ownerAdminId },
    include: leaveInclude,
  });

  if (!leave) throw new Error("Leave request not found.");
  if (leave.status === "Cancelled") throw new Error("Cancelled leave requests cannot be rejected.");

  const updated = await prisma.leaveRequest.update({
    where: { id: leave.id },
    data: {
      status: "Rejected",
      rejectionReason: args.note,
      rejectedBy: args.rejectedBy,
      rejectedAt: new Date(),
      approvalNote: null,
      approvedBy: null,
      approvedAt: null,
      modifiedBy: args.rejectedBy,
    },
    include: leaveInclude,
  });

  return mapLeaveRow(updated);
}

export async function cancelLeaveRequest(args: {
  leaveId: string;
  ownerAdminId: string;
  userId: string;
  note: string;
}) {
  const leave = await prisma.leaveRequest.findFirst({
    where: { id: args.leaveId, ownerAdminId: args.ownerAdminId, userId: args.userId },
    include: leaveInclude,
  });

  if (!leave) throw new Error("Leave request not found.");
  if (leave.status !== "Pending") {
    throw new Error("Only pending leave requests can be cancelled.");
  }

  const updated = await prisma.leaveRequest.update({
    where: { id: leave.id },
    data: {
      status: "Cancelled",
      cancelledBy: args.userId,
      cancelledAt: new Date(),
      modifiedBy: args.userId,
      rejectionReason: args.note,
    },
    include: leaveInclude,
  });

  return mapLeaveRow(updated);
}

export async function getLeaveReport(params: {
  ownerAdminId: string;
  userId: string;
  canViewAll: boolean;
  isSuperAdmin: boolean;
  filterUserId?: string;
  departmentId?: string;
  officeLocationId?: string;
  month?: number;
  year?: number;
}) {
  try {
    const rows = await listLeaveRequests({
      ownerAdminId: params.ownerAdminId,
      userId: params.userId,
      canViewAll: params.canViewAll,
      isSuperAdmin: params.isSuperAdmin,
      filterUserId: params.filterUserId,
      departmentId: params.departmentId,
      officeLocationId: params.officeLocationId,
      month: params.month,
      year: params.year,
    });

    const stats = rows.reduce(
      (acc, row) => {
        if (row.status === "Approved") acc.approved += 1;
        if (row.status === "Rejected") acc.rejected += 1;
        if (row.status === "Pending") acc.pending += 1;
        if (row.status === "Cancelled") acc.cancelled += 1;
        return acc;
      },
      { approved: 0, rejected: 0, pending: 0, cancelled: 0 },
    );

    return { rows, stats };
  } catch (err) {
    if (isTableMissingError(err)) {
      return { rows: [], stats: { approved: 0, rejected: 0, pending: 0, cancelled: 0 } };
    }
    throw err;
  }
}
