import type { LeadStatus } from "@prisma/client";

import type { LeadFormValues } from "@/features/lead/data/lead.data";

export type LeadRow = {
  id: string;
  leadCode: string;
  clientName: string;
  firstName: string;
  lastName: string;
  countryCode: string;
  mobileNumber: string;
  mobile: string;
  email: string;
  docType: string;
  noOfDocuments: string;
  service: string;
  status: LeadFormValues["leadStatus"];
  country: string;
  state: string;
  documentIssuedCountry: string;
  source: string;
  clientType: string;
  amount: string;
  workingDays: string;
  assignedUserId: string;
  assignedUser: string;
  createdDate: string;
  createdAt: string;
  remark: string;
  rawAmount: number;
  nextFollowupAt: string | null;
};

export type LeadAssignableUser = {
  id: string;
  name: string;
  email: string;
};

export type AssignLeadsResponse = {
  items: LeadRow[];
  totalLeads: number;
};

export type LeadListResponse = {
  items: LeadRow[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

export type DashboardStatsResponse = {
  totalLeads: number;
  activeLeads: number;
  closedLeads: number;
  pendingLeads: number;
  totalRevenue: number;
  followups: number;
  recentLeads: LeadRow[];
  recentActivities: Array<{
    title: string;
    time: string;
    detail: string;
  }>;
  charts: {
    monthlyLeads: Array<{
      month: string;
      value: number;
    }>;
    revenueTrends: Array<{
      month: string;
      value: number;
    }>;
    leadsByStatus: Array<{
      label: string;
      value: number;
      rate: string;
    }>;
    followupCounts: Array<{
      label: string;
      value: number;
    }>;
  };
};

export type LobResponse = {
  items: Array<{
    service: string;
    leadCount: number;
    activeLeads: number;
    closedLeads: number;
    totalRevenue: number;
  }>;
};

export type PrismaLeadStatus = LeadStatus;
