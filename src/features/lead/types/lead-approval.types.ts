export type LeadApprovalStatus = "Pending" | "Approved" | "Rejected";

export type LeadApprovalItem = {
  id: string;
  leadId: string;
  leadCode: string;
  leadName: string;
  mobile: string;
  service: string;
  currentStatus: string;
  requestedStatus: string;
  requestedBy: string;
  supervisorName: string;
  approvalStatus: LeadApprovalStatus;
  approvalReason: string | null;
  rejectionReason: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  requestDate: string;
  createdAt: string;
  country: string;
  email: string;
  assignedUser: string;
  remark: string;
};

export type LeadApprovalStats = {
  pendingApprovals: number;
  approvedToday: number;
  rejectedToday: number;
  totalRequests: number;
};

export type LeadApprovalHistoryResponse = {
  approved: LeadApprovalItem[];
  rejected: LeadApprovalItem[];
  stats: LeadApprovalStats;
};
