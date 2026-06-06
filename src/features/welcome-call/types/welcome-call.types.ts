export const welcomeCallStatuses = [
  "Pending",
  "Called",
  "Completed",
  "Not Reachable",
  "Followup Required",
] as const;

export type WelcomeCallStatus = (typeof welcomeCallStatuses)[number];

export type WelcomeCallItem = {
  id: string;
  registrationNumber: string;
  clientName: string;
  mobile: string;
  processType: string;
  service: string;
  totalCharges: number;
  committedDuration: string;
  officeLocation: string;
  assignedUser: string;
  registrationDate: string;
  registrationDateIso: string;
  welcomeCallStatus: string;
  welcomeCalledBy: string | null;
  welcomeCalledAt: string | null;
  documentType: string;
  address: string;
  country: string;
  state: string;
  city: string;
  customerType: string;
  priority: string;
  paymentStatus: string;
  paymentMode: string;
  advancePaid: number;
  balanceAmount: number;
  registeredPerson: string;
  createdBy: string;
  trackingStatus: string;
  approvalStatus: string;
};

export type WelcomeCallStats = {
  totalWelcomeCallsToday: number;
  completedCalls: number;
  pendingCalls: number;
  missedCalls: number;
};

export type WelcomeCallFilters = {
  statuses: string[];
};

export type WelcomeCallResponse = {
  items: WelcomeCallItem[];
  stats: WelcomeCallStats;
  filters: WelcomeCallFilters;
  queueDate: string;
};
