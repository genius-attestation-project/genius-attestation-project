export type AttendanceStatus = "Present" | "Late" | "Absent" | "HalfDay";
export type AttendanceApprovalStatus = "Pending" | "Approved" | "Rejected";

export type AttendanceRecord = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  officeLocation: string;
  attendanceDate: string; // ISO date string
  checkinTime: string | null;
  checkoutTime: string | null;
  workingHours: string | null;
  status: AttendanceStatus;
  dailySummary: string | null;
  checkinRemarks: string | null;
  approvalStatus: AttendanceApprovalStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
};

export type AttendanceSetting = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  expectedCheckinTime: string;  // "HH:mm"
  expectedCheckoutTime: string; // "HH:mm"
};

export type AttendanceStats = {
  presentToday: number;
  absentToday: number;
  lateToday: number;
  pendingApproval: number;
  approvedToday: number;
};

export type CheckinPayload = {
  checkinTime?: string; // ISO datetime — defaults to now
  checkinRemarks?: string;
};

export type CheckoutPayload = {
  checkoutTime?: string; // ISO datetime — defaults to now
  dailySummary: string;
};

export type ApprovePayload = {
  approvedBy: string;
};

export type RejectPayload = {
  rejectionReason: string;
};

export type AttendanceSettingPayload = {
  userId: string;
  expectedCheckinTime: string;
  expectedCheckoutTime: string;
};
