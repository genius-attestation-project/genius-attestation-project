export type DateRangeOption = 
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'last30'
  | 'thisMonth'
  | 'lastMonth'
  | 'custom'
  | 'all';

export interface GlobalReportFilters {
  dateRange: DateRangeOption;
  startDate?: string;
  endDate?: string;

  // Global Context
  createdBy?: string;
  assignedUser?: string;
  officeLocationId?: string;
  departmentId?: string;
  
  // Specific Context
  leadStatus?: string;
  leadSource?: string;
  customerType?: string;
  processType?: string;
  documentType?: string;
  paymentStatus?: string;
  paymentMode?: string;
  attendanceStatus?: string;
}

export interface ExecutiveSummaryMetrics {
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

  charts: {
    revenueTrend: { date: string; revenue: number }[];
    leadSources: { name: string; value: number }[];
  };
}
