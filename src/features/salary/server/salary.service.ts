import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { formatDateTime, isTableMissingError, isWeekend, monthBounds, eachDayInclusive, toIsoDate } from "@/features/attendance/server/attendance.shared";
import type {
  SalaryApproveRequest,
  SalaryCalculationRow,
  SalaryDashboardResponse,
  SalaryGenerateRequest,
  SalaryPayrollRow,
  SalaryPayrollStatus,
  SalaryReportsResponse,
  SalarySummary,
} from "@/features/salary/types/salary.types";

type SalaryUserRecord = {
  id: string;
  name: string | null;
  email: string;
  monthlySalary: Prisma.Decimal;
  departmentName: string | null;
  officeLocationName: string | null;
  departmentRef: { name: string } | null;
  officeLocationRef: { officeName: string } | null;
};

type SalaryAttendanceRecord = {
  userId: string;
  attendanceDate: Date;
  status: string;
};

type SalaryLeaveRecord = {
  userId: string;
  fromDate: Date;
  toDate: Date;
  totalDays: Prisma.Decimal;
  status: string;
};

type SalaryHolidayRecord = {
  holidayDate: Date;
};

type SalaryLeaveBucket = {
  approved: number;
  pending: number;
  rejected: number;
};

type MonthWindow = {
  month: number;
  year: number;
  start: Date;
  end: Date;
};

function decimalValue(value: Prisma.Decimal | number | string | null | undefined) {
  return new Prisma.Decimal(value ?? 0);
}

function moneyString(value: Prisma.Decimal | number | string | null | undefined) {
  return decimalValue(value).toFixed(2);
}

function roundDays(value: number) {
  return Math.round(value * 100) / 100;
}

function currentMonthWindow(month?: number, year?: number): MonthWindow {
  const now = new Date();
  const resolvedMonth = Number.isInteger(month) && month && month >= 1 && month <= 12 ? month : now.getMonth() + 1;
  const resolvedYear = Number.isInteger(year) && year && year >= 1970 ? year : now.getFullYear();
  const bounds = monthBounds(resolvedYear, resolvedMonth);

  return {
    month: resolvedMonth,
    year: resolvedYear,
    start: bounds.start,
    end: bounds.end,
  };
}

function workspaceUserFilter(ownerAdminId: string) {
  return [{ ownerAdminId }, { id: ownerAdminId }];
}

async function loadUsers(ownerAdminId: string, userId?: string) {
  return prisma.user.findMany({
    where: {
      OR: workspaceUserFilter(ownerAdminId),
      ...(userId ? { id: userId } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      monthlySalary: true,
      departmentName: true,
      officeLocationName: true,
      departmentRef: { select: { name: true } },
      officeLocationRef: { select: { officeName: true } },
    },
    orderBy: { name: "asc" },
  }) as Promise<SalaryUserRecord[]>;
}

async function loadAttendanceRecords(ownerAdminId: string, window: MonthWindow, userId?: string) {
  return prisma.attendanceRecord.findMany({
    where: {
      ownerAdminId,
      attendanceDate: {
        gte: window.start,
        lte: window.end,
      },
      ...(userId ? { userId } : {}),
    },
    select: {
      userId: true,
      attendanceDate: true,
      status: true,
    },
  }) as Promise<SalaryAttendanceRecord[]>;
}

async function loadLeaveRecords(ownerAdminId: string, window: MonthWindow, userId?: string) {
  return prisma.leaveRequest.findMany({
    where: {
      ownerAdminId,
      status: { in: ["Pending", "Approved", "Rejected"] },
      fromDate: { lte: window.end },
      toDate: { gte: window.start },
      ...(userId ? { userId } : {}),
    },
    select: {
      userId: true,
      fromDate: true,
      toDate: true,
      totalDays: true,
      status: true,
    },
  }) as Promise<SalaryLeaveRecord[]>;
}

async function loadHolidays(ownerAdminId: string, window: MonthWindow) {
  try {
    return (await prisma.salaryHoliday.findMany({
      where: {
        OR: [{ ownerAdminId }, { ownerAdminId: null }],
        status: "Approved",
        holidayDate: {
          gte: window.start,
          lte: window.end,
        },
      },
      select: {
        holidayDate: true,
      },
    })) as SalaryHolidayRecord[];
  } catch (error) {
    if (isTableMissingError(error)) {
      return [];
    }
    throw error;
  }
}

function buildWorkingDates(window: MonthWindow, holidays: SalaryHolidayRecord[]) {
  const holidaySet = new Set(holidays.map((holiday) => toIsoDate(holiday.holidayDate)));
  return eachDayInclusive(window.start, window.end).filter((date) => !isWeekend(date) && !holidaySet.has(toIsoDate(date)));
}

function buildAttendanceMap(records: SalaryAttendanceRecord[]) {
  const map = new Map<string, SalaryAttendanceRecord>();

  for (const record of records) {
    map.set(toIsoDate(record.attendanceDate), record);
  }

  return map;
}

function buildLeaveBucketMap(records: SalaryLeaveRecord[], workingDateSet: Set<string>) {
  const map = new Map<string, SalaryLeaveBucket>();

  for (const record of records) {
    const overlapStart = record.fromDate > record.toDate ? record.toDate : record.fromDate;
    const overlapEnd = record.toDate < record.fromDate ? record.fromDate : record.toDate;
    const days = eachDayInclusive(overlapStart, overlapEnd).filter((date) => workingDateSet.has(toIsoDate(date)));

    if (days.length === 0) {
      continue;
    }

    const totalDays = Number(record.totalDays ?? 0);
    const perDayWeight = Math.min(1, totalDays / days.length || 0);

    for (const date of days) {
      const key = toIsoDate(date);
      const bucket = map.get(key) ?? { approved: 0, pending: 0, rejected: 0 };

      if (record.status === "Approved") {
        bucket.approved += perDayWeight;
      } else if (record.status === "Pending") {
        bucket.pending += perDayWeight;
      } else if (record.status === "Rejected") {
        bucket.rejected += perDayWeight;
      }

      map.set(key, bucket);
    }
  }

  return map;
}

function buildCalculationRow(user: SalaryUserRecord, params: {
  month: number;
  year: number;
  window: MonthWindow;
  workingDates: Date[];
  attendanceMap: Map<string, SalaryAttendanceRecord>;
  leaveBucketMap: Map<string, SalaryLeaveBucket>;
}): SalaryCalculationRow {
  let presentDays = 0;
  let absentDays = 0;
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  let attendanceCount = 0;
  let approvedLeaveCount = 0;
  let pendingLeaveCount = 0;
  let rejectedLeaveCount = 0;

  for (const date of params.workingDates) {
    const key = toIsoDate(date);
    const leaveBucket = params.leaveBucketMap.get(key);

    if (leaveBucket) {
      if (leaveBucket.approved > 0) {
        paidLeaveDays += leaveBucket.approved;
        approvedLeaveCount += 1;
      } else {
        unpaidLeaveDays += leaveBucket.pending + leaveBucket.rejected;
        if (leaveBucket.pending > 0) pendingLeaveCount += 1;
        if (leaveBucket.rejected > 0) rejectedLeaveCount += 1;
      }
      continue;
    }

    const attendance = params.attendanceMap.get(key);
    if (!attendance) {
      continue;
    }

    attendanceCount += 1;

    switch (attendance.status) {
      case "Present":
      case "Late":
        presentDays += 1;
        break;
      case "HalfDay":
        presentDays += 0.5;
        break;
      case "Absent":
        absentDays += 1;
        break;
      default:
        break;
    }
  }

  const workingDays = params.workingDates.length;
  const monthlySalary = decimalValue(user.monthlySalary);
  const perDayRate = workingDays > 0 ? monthlySalary.div(workingDays) : decimalValue(0);
  const leaveDays = roundDays(paidLeaveDays + unpaidLeaveDays);
  const lopDays = roundDays(absentDays + unpaidLeaveDays);
  const grossSalary = monthlySalary;
  const earnedSalary = perDayRate.mul(roundDays(presentDays + paidLeaveDays));
  const lopDeduction = perDayRate.mul(lopDays);
  const netPayableDecimal = grossSalary.minus(lopDeduction);
  const netPayable = netPayableDecimal.lessThan(0) ? decimalValue(0) : netPayableDecimal;

  return {
    month: params.month,
    year: params.year,
    userId: user.id,
    userName: user.name ?? "Workspace User",
    userEmail: user.email,
    department: user.departmentRef?.name ?? user.departmentName ?? "-",
    officeLocation: user.officeLocationRef?.officeName ?? user.officeLocationName ?? "-",
    monthlySalary: moneyString(monthlySalary),
    periodStart: toIsoDate(params.window.start),
    periodEnd: toIsoDate(params.window.end),
    workingDays,
    presentDays: roundDays(presentDays),
    paidLeaveDays: roundDays(paidLeaveDays),
    unpaidLeaveDays: roundDays(unpaidLeaveDays),
    leaveDays,
    absentDays: roundDays(absentDays),
    lopDays,
    grossSalary: moneyString(grossSalary),
    perDayRate: moneyString(perDayRate),
    earnedSalary: moneyString(earnedSalary),
    lopDeduction: moneyString(lopDeduction),
    netPayable: moneyString(netPayable),
    attendanceCount,
    approvedLeaveCount,
    pendingLeaveCount,
    rejectedLeaveCount,
  };
}

function summarizeCalculations(rows: SalaryCalculationRow[]): SalarySummary {
  const totals = rows.reduce(
    (acc, row) => {
      acc.workingDaysTotal += row.workingDays;
      acc.presentDaysTotal += row.presentDays;
      acc.paidLeaveDaysTotal += row.paidLeaveDays;
      acc.unpaidLeaveDaysTotal += row.unpaidLeaveDays;
      acc.lopDaysTotal += row.lopDays;
      acc.grossSalaryTotal = acc.grossSalaryTotal.plus(row.grossSalary);
      acc.earnedSalaryTotal = acc.earnedSalaryTotal.plus(row.earnedSalary);
      acc.lopDeductionTotal = acc.lopDeductionTotal.plus(row.lopDeduction);
      acc.netPayableTotal = acc.netPayableTotal.plus(row.netPayable);
      return acc;
    },
    {
      workingDaysTotal: 0,
      presentDaysTotal: 0,
      paidLeaveDaysTotal: 0,
      unpaidLeaveDaysTotal: 0,
      lopDaysTotal: 0,
      grossSalaryTotal: decimalValue(0),
      earnedSalaryTotal: decimalValue(0),
      lopDeductionTotal: decimalValue(0),
      netPayableTotal: decimalValue(0),
    },
  );

  return {
    employeeCount: rows.length,
    payrollCount: rows.length,
    generatedCount: 0,
    approvedCount: 0,
    paidCount: 0,
    workingDaysTotal: roundDays(totals.workingDaysTotal),
    presentDaysTotal: roundDays(totals.presentDaysTotal),
    paidLeaveDaysTotal: roundDays(totals.paidLeaveDaysTotal),
    unpaidLeaveDaysTotal: roundDays(totals.unpaidLeaveDaysTotal),
    lopDaysTotal: roundDays(totals.lopDaysTotal),
    grossSalaryTotal: moneyString(totals.grossSalaryTotal),
    earnedSalaryTotal: moneyString(totals.earnedSalaryTotal),
    lopDeductionTotal: moneyString(totals.lopDeductionTotal),
    netPayableTotal: moneyString(totals.netPayableTotal),
  };
}

function summarizePayrolls(rows: SalaryPayrollRow[]): SalarySummary {
  const totals = rows.reduce(
    (acc, row) => {
      acc.workingDaysTotal += row.workingDays;
      acc.presentDaysTotal += row.presentDays;
      acc.paidLeaveDaysTotal += row.paidLeaveDays;
      acc.unpaidLeaveDaysTotal += row.unpaidLeaveDays;
      acc.lopDaysTotal += row.lopDays;
      acc.grossSalaryTotal = acc.grossSalaryTotal.plus(row.grossSalary);
      acc.earnedSalaryTotal = acc.earnedSalaryTotal.plus(row.earnedSalary);
      acc.lopDeductionTotal = acc.lopDeductionTotal.plus(row.lopDeduction);
      acc.netPayableTotal = acc.netPayableTotal.plus(row.netPayable);
      return acc;
    },
    {
      workingDaysTotal: 0,
      presentDaysTotal: 0,
      paidLeaveDaysTotal: 0,
      unpaidLeaveDaysTotal: 0,
      lopDaysTotal: 0,
      grossSalaryTotal: decimalValue(0),
      earnedSalaryTotal: decimalValue(0),
      lopDeductionTotal: decimalValue(0),
      netPayableTotal: decimalValue(0),
    },
  );

  const summary = {
    employeeCount: rows.length,
    payrollCount: rows.length,
    generatedCount: rows.filter((row) => row.payrollStatus === "Generated" || row.payrollStatus === "Draft").length,
    approvedCount: rows.filter((row) => row.payrollStatus === "Approved").length,
    paidCount: rows.filter((row) => row.payrollStatus === "Paid").length,
    workingDaysTotal: roundDays(totals.workingDaysTotal),
    presentDaysTotal: roundDays(totals.presentDaysTotal),
    paidLeaveDaysTotal: roundDays(totals.paidLeaveDaysTotal),
    unpaidLeaveDaysTotal: roundDays(totals.unpaidLeaveDaysTotal),
    lopDaysTotal: roundDays(totals.lopDaysTotal),
    grossSalaryTotal: moneyString(totals.grossSalaryTotal),
    earnedSalaryTotal: moneyString(totals.earnedSalaryTotal),
    lopDeductionTotal: moneyString(totals.lopDeductionTotal),
    netPayableTotal: moneyString(totals.netPayableTotal),
  };

  return summary;
}

function mapPayrollRow(row: {
  id: string;
  userId: string;
  payrollMonth: number;
  payrollYear: number;
  periodStart: Date;
  periodEnd: Date;
  userNameSnapshot: string;
  userEmailSnapshot: string;
  departmentSnapshot: string;
  officeLocationSnapshot: string;
  monthlySalarySnapshot: Prisma.Decimal;
  workingDays: Prisma.Decimal;
  presentDays: Prisma.Decimal;
  paidLeaveDays: Prisma.Decimal;
  unpaidLeaveDays: Prisma.Decimal;
  leaveDays: Prisma.Decimal;
  lopDays: Prisma.Decimal;
  grossSalary: Prisma.Decimal;
  perDayRate: Prisma.Decimal;
  earnedSalary: Prisma.Decimal;
  lopDeduction: Prisma.Decimal;
  netPayable: Prisma.Decimal;
  payrollStatus: string;
  generatedBy: string | null;
  generatedAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  paidBy: string | null;
  paidAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SalaryPayrollRow {
  return {
    id: row.id,
    userId: row.userId,
    month: row.payrollMonth,
    year: row.payrollYear,
    userName: row.userNameSnapshot,
    userEmail: row.userEmailSnapshot,
    department: row.departmentSnapshot,
    officeLocation: row.officeLocationSnapshot,
    monthlySalary: moneyString(row.monthlySalarySnapshot),
    periodStart: toIsoDate(row.periodStart),
    periodEnd: toIsoDate(row.periodEnd),
    workingDays: Number(row.workingDays),
    presentDays: Number(row.presentDays),
    paidLeaveDays: Number(row.paidLeaveDays),
    unpaidLeaveDays: Number(row.unpaidLeaveDays),
    leaveDays: Number(row.leaveDays),
    absentDays: Number(row.lopDays) - Number(row.unpaidLeaveDays),
    lopDays: Number(row.lopDays),
    grossSalary: moneyString(row.grossSalary),
    perDayRate: moneyString(row.perDayRate),
    earnedSalary: moneyString(row.earnedSalary),
    lopDeduction: moneyString(row.lopDeduction),
    netPayable: moneyString(row.netPayable),
    attendanceCount: 0,
    approvedLeaveCount: 0,
    pendingLeaveCount: 0,
    rejectedLeaveCount: 0,
    payrollStatus: row.payrollStatus as SalaryPayrollStatus,
    generatedBy: row.generatedBy,
    generatedAt: formatDateTime(row.generatedAt),
    approvedBy: row.approvedBy,
    approvedAt: formatDateTime(row.approvedAt),
    paidBy: row.paidBy,
    paidAt: formatDateTime(row.paidAt),
    notes: row.notes,
    createdAt: formatDateTime(row.createdAt) ?? "",
    updatedAt: formatDateTime(row.updatedAt) ?? "",
  };
}

async function loadCalculationContext(ownerAdminId: string, window: MonthWindow, userId?: string) {
  const [users, attendanceRecords, leaveRecords, holidays] = await Promise.all([
    loadUsers(ownerAdminId, userId),
    loadAttendanceRecords(ownerAdminId, window, userId),
    loadLeaveRecords(ownerAdminId, window, userId),
    loadHolidays(ownerAdminId, window),
  ]);

  const workingDates = buildWorkingDates(window, holidays);
  const workingDateSet = new Set(workingDates.map((date) => toIsoDate(date)));

  const calculations = users.map((user) =>
    buildCalculationRow(user, {
      month: window.month,
      year: window.year,
      window,
      workingDates,
      attendanceMap: buildAttendanceMap(
        attendanceRecords.filter(
          (record) => record.userId === user.id && workingDateSet.has(toIsoDate(record.attendanceDate)),
        ),
      ),
      leaveBucketMap: buildLeaveBucketMap(
        leaveRecords.filter((record) => record.userId === user.id),
        workingDateSet,
      ),
    }),
  );

  return {
    users,
    workingDates,
    calculations,
    attendanceRecords,
    leaveRecords,
    holidays,
  };
}

export async function getSalaryCalculations(ownerAdminId: string, params?: { month?: number; year?: number; userId?: string }) {
  const window = currentMonthWindow(params?.month, params?.year);
  const context = await loadCalculationContext(ownerAdminId, window, params?.userId);
  const summary = summarizeCalculations(context.calculations);

  return {
    month: window.month,
    year: window.year,
    calculations: context.calculations,
    summary,
  };
}

async function loadPayrollRows(ownerAdminId: string, window: MonthWindow, userId?: string, status?: string) {
  try {
    const rows = await prisma.salaryPayroll.findMany({
      where: {
        ownerAdminId,
        payrollMonth: window.month,
        payrollYear: window.year,
        ...(userId ? { userId } : {}),
        ...(status ? { payrollStatus: status as SalaryPayrollStatus } : {}),
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });

    return rows.map(mapPayrollRow);
  } catch (error) {
    if (isTableMissingError(error)) {
      return [];
    }
    throw error;
  }
}

export async function getSalaryDashboard(ownerAdminId: string, params?: { month?: number; year?: number }) {
  const window = currentMonthWindow(params?.month, params?.year);
  const context = await loadCalculationContext(ownerAdminId, window);
  const summary = summarizeCalculations(context.calculations);
  const recentPayrolls = await loadPayrollRows(ownerAdminId, window);

  return {
    month: window.month,
    year: window.year,
    summary,
    calculations: context.calculations,
    recentPayrolls: recentPayrolls.slice(0, 10),
  } satisfies SalaryDashboardResponse;
}

export async function getSalaryReports(ownerAdminId: string, params?: { month?: number; year?: number; userId?: string; status?: string }) {
  const window = currentMonthWindow(params?.month, params?.year);
  const rows = await loadPayrollRows(ownerAdminId, window, params?.userId, params?.status);
  const summary = summarizePayrolls(rows);

  return {
    month: window.month,
    year: window.year,
    rows,
    summary,
  } satisfies SalaryReportsResponse;
}

async function findPayrollById(ownerAdminId: string, payrollId: string) {
  return prisma.salaryPayroll.findFirst({
    where: { id: payrollId, ownerAdminId },
  });
}

async function findPayrollByUserMonthYear(ownerAdminId: string, userId: string, month: number, year: number) {
  return prisma.salaryPayroll.findFirst({
    where: { ownerAdminId, userId, payrollMonth: month, payrollYear: year },
  });
}

function payrollSnapshotData(calculation: SalaryCalculationRow, ownerAdminId: string, generatedBy: string, notes?: string | null) {
  return {
    userId: calculation.userId,
    payrollMonth: calculation.month,
    payrollYear: calculation.year,
    periodStart: new Date(`${calculation.periodStart}T00:00:00`),
    periodEnd: new Date(`${calculation.periodEnd}T00:00:00`),
    userNameSnapshot: calculation.userName,
    userEmailSnapshot: calculation.userEmail,
    departmentSnapshot: calculation.department,
    officeLocationSnapshot: calculation.officeLocation,
    monthlySalarySnapshot: decimalValue(calculation.monthlySalary),
    workingDays: decimalValue(calculation.workingDays),
    presentDays: decimalValue(calculation.presentDays),
    paidLeaveDays: decimalValue(calculation.paidLeaveDays),
    unpaidLeaveDays: decimalValue(calculation.unpaidLeaveDays),
    leaveDays: decimalValue(calculation.leaveDays),
    lopDays: decimalValue(calculation.lopDays),
    grossSalary: decimalValue(calculation.grossSalary),
    perDayRate: decimalValue(calculation.perDayRate),
    earnedSalary: decimalValue(calculation.earnedSalary),
    lopDeduction: decimalValue(calculation.lopDeduction),
    netPayable: decimalValue(calculation.netPayable),
    payrollStatus: "Generated" as SalaryPayrollStatus,
    generatedBy,
    generatedAt: new Date(),
    notes: notes ?? null,
    ownerAdminId,
  };
}

export async function generateSalaryPayrolls(ownerAdminId: string, params: SalaryGenerateRequest & { generatedBy: string }) {
  const window = currentMonthWindow(params.month, params.year);
  const context = await loadCalculationContext(ownerAdminId, window, params.userId);
  const payloads = context.calculations;
  const results: SalaryPayrollRow[] = [];

  const existingPayrolls = await prisma.salaryPayroll.findMany({
    where: {
      ownerAdminId,
      payrollMonth: window.month,
      payrollYear: window.year,
      userId: { in: payloads.map((p) => p.userId) },
    },
  });

  const existingMap = new Map(existingPayrolls.map((p) => [p.userId, p]));
  const upsertPromises = [];

  for (const calculation of payloads) {
    const existing = existingMap.get(calculation.userId);
    if (existing && (existing.payrollStatus === "Approved" || existing.payrollStatus === "Paid")) {
      results.push(mapPayrollRow(existing as never));
      continue;
    }

    const snapshot = payrollSnapshotData(calculation, ownerAdminId, params.generatedBy, params.notes);
    upsertPromises.push(
      prisma.salaryPayroll.upsert({
        where: {
          userId_payrollMonth_payrollYear_ownerAdminId: {
            userId: calculation.userId,
            payrollMonth: calculation.month,
            payrollYear: calculation.year,
            ownerAdminId,
          },
        },
        create: snapshot,
        update: snapshot,
      })
    );
  }

  if (upsertPromises.length > 0) {
    const savedRows = await prisma.$transaction(upsertPromises);
    for (const saved of savedRows) {
      results.push(mapPayrollRow(saved as never));
    }
  }

  return {
    month: window.month,
    year: window.year,
    generated: results,
    summary: summarizePayrolls(results),
  };
}

export async function approveSalaryPayroll(ownerAdminId: string, params: SalaryApproveRequest & { approvedBy: string }) {
  const payroll = await findPayrollById(ownerAdminId, params.payrollId);
  if (!payroll) {
    throw new Error("Payroll record not found.");
  }

  if (payroll.payrollStatus === "Paid") {
    return mapPayrollRow(payroll as never);
  }

  const updated = await prisma.salaryPayroll.update({
    where: { id: payroll.id },
    data: {
      payrollStatus: "Approved",
      approvedBy: params.approvedBy,
      approvedAt: new Date(),
    },
  });

  return mapPayrollRow(updated as never);
}





