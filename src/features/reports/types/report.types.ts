export interface GlobalReportFilters {
  fromDate?: string;
  toDate?: string;
  officeId?: string;
  departmentId?: string;
  userId?: string;
  userName?: string;
  assignedUserId?: string;
  leadStatus?: string;
  paymentStatus?: string;
  countryId?: string;
  serviceId?: string;
  documentTypeId?: string;
  processOfficeId?: string;
  leadSourceId?: string;
  search?: string;
}

export interface ExecutiveSummaryMetrics {
  userName?: string;
  leadsCreated: number;
  revenueRegistrations: number;
  followupsCreated: number;
  followupsCompleted: number;
  followupsExtended: number;
  callsMade: number;
  
  // Attendance
  presentDays: number;
  totalWorkingHours: number;
  dailySummariesSubmitted: number;

  // Operations
  bmMovements: number;
  processActions: number;
  documentsDelivered: number;

  // Financials
  revenueGenerated: number; // Total charges of registrations
  pendingRevenue: number;   // Balance amount
  totalCustomersHandled: number;

  // Workflow Approvals
  inactiveLeads: number;
  lobRequests: number;
  overdueFollowups: number;

  charts: {
    revenueTrend: { date: string; revenue: number }[];
    leadSources: { name: string; value: number }[];
  };
}
