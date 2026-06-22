import type { LeaveRequestStatus } from "@/features/attendance/types/attendance.types";

export const LEAVE_TYPES = [
  "Casual Leave",
  "Sick Leave",
  "Emergency Leave",
  "Annual Leave",
  "Half Day Leave",
  "Other",
] as const;

export type LeaveType = (typeof LEAVE_TYPES)[number];

export type LeaveRequestRow = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  department: string;
  officeLocation: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  fromDateIso: string;
  toDateIso: string;
  totalDays: string;
  reason: string;
  attachmentUrl: string | null;
  status: LeaveRequestStatus;
  approvalNote: string | null;
  rejectionReason: string | null;
  appliedBy: string | null;
  appliedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
  modifiedBy: string | null;
  modifiedAt: string;
};

export type LeaveReportStats = {
  approved: number;
  rejected: number;
  pending: number;
  cancelled: number;
};
