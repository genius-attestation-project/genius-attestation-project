export type SalaryPayrollStatus = "Draft" | "Generated" | "Approved" | "Paid";

export type SalaryMonthYear = {
  month: number;
  year: number;
};

export type SalarySummary = {
  employeeCount: number;
  payrollCount: number;
  generatedCount: number;
  approvedCount: number;
  paidCount: number;
  workingDaysTotal: number;
  presentDaysTotal: number;
  paidLeaveDaysTotal: number;
  unpaidLeaveDaysTotal: number;
  lopDaysTotal: number;
  grossSalaryTotal: string;
  earnedSalaryTotal: string;
  lopDeductionTotal: string;
  netPayableTotal: string;
};

export type SalaryCalculationRow = SalaryMonthYear & {
  userId: string;
  userName: string;
  userEmail: string;
  department: string;
  officeLocation: string;
  monthlySalary: string;
  periodStart: string;
  periodEnd: string;
  workingDays: number;
  presentDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  leaveDays: number;
  absentDays: number;
  lopDays: number;
  grossSalary: string;
  perDayRate: string;
  earnedSalary: string;
  lopDeduction: string;
  netPayable: string;
  attendanceCount: number;
  approvedLeaveCount: number;
  pendingLeaveCount: number;
  rejectedLeaveCount: number;
};

export type SalaryPayrollRow = SalaryCalculationRow & {
  id: string;
  payrollStatus: SalaryPayrollStatus;
  generatedBy: string | null;
  generatedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  paidBy: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SalaryDashboardResponse = {
  month: number;
  year: number;
  summary: SalarySummary;
  calculations: SalaryCalculationRow[];
  recentPayrolls: SalaryPayrollRow[];
};

export type SalaryCalculateResponse = {
  month: number;
  year: number;
  calculations: SalaryCalculationRow[];
  summary: SalarySummary;
};

export type SalaryReportsResponse = {
  month: number;
  year: number;
  rows: SalaryPayrollRow[];
  summary: SalarySummary;
};

export type SalaryGenerateRequest = SalaryMonthYear & {
  userId?: string;
  notes?: string;
};

export type SalaryApproveRequest = {
  payrollId: string;
};
