export type AttendanceStatus = "Present" | "Late" | "Absent" | "HalfDay" | "Leave";
export type AttendanceApprovalStatus = "Pending" | "Approved" | "Rejected";
export type LeaveRequestStatus = "Pending" | "Approved" | "Rejected" | "Cancelled";

export type AttendanceRecord = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  department: string;
  officeLocation: string;
  attendanceDate: string;
  attendanceDateIso: string;
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
  leaveRequestId: string | null;
  leaveType: string | null;
  leaveStatus: LeaveRequestStatus | null;
  leaveReason: string | null;
  createdAt: string;
};

export type AttendanceSetting = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  expectedCheckinTime: string;
  expectedCheckoutTime: string;
};

export type AttendanceStats = {
  presentToday: number;
  absentToday: number;
  onLeaveToday: number;
  lateToday: number;
  pendingLeaveRequests: number;
  approvedLeavesThisMonth: number;
};

export type CalendarDisplayStatus =
  | "Present"
  | "Absent"
  | "Late"
  | "Half Day"
  | "Approved Leave"
  | "Rejected Leave"
  | "Pending Leave"
  | "Holiday"
  | "Empty";

export type AttendanceCalendarSummary = {
  status: CalendarDisplayStatus;
  count: number;
  color: string;
  label: string;
};

export type AttendanceCalendarDetail = {
  userId: string;
  userName: string;
  department: string;
  officeLocation: string;
  supervisor: string | null;
  date: string;
  checkinTime: string | null;
  checkoutTime: string | null;
  workingHours: string | null;
  status: CalendarDisplayStatus;
  attendanceStatus: AttendanceStatus | null;
  approvalStatus: AttendanceApprovalStatus | null;
  leaveRequestId: string | null;
  leaveType: string | null;
  leaveStatus: LeaveRequestStatus | null;
  leaveReason: string | null;
  approvalNote: string | null;
  rejectionReason: string | null;
  description: string | null;
};

export type AttendanceCalendarDay = {
  date: string;
  summaries: AttendanceCalendarSummary[];
  details: AttendanceCalendarDetail[];
};

export type AttendanceCalendarOverview = {
  present: number;
  absent: number;
  late: number;
  leave: number;
};

export type AttendanceCalendarResponse = {
  month: number;
  year: number;
  summary: AttendanceCalendarOverview;
  days: AttendanceCalendarDay[];
  totalUsers: number;
  range: {
    from: string;
    to: string;
  };
};

export type CheckinPayload = {
  checkinTime?: string;
  checkinRemarks?: string;
};

export type CheckoutPayload = {
  checkoutTime?: string;
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
