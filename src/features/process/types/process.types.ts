import { z } from "zod";

export const ProcessLocations = ["IN_HAND", "INBOUND", "COMPLETED", "REJECTED", "SEND_TO_OFFICE", "HOME", "Pending", "Pending Receive"] as const;
export type ProcessLocation = (typeof ProcessLocations)[number] | string;

export const ProcessStatuses = ["IN_HAND", "INBOUND", "COMPLETED", "REJECTED", "SEND_TO_OFFICE", "HOME", "Pending", "Pending Receive"] as const;
export type ProcessStatus = (typeof ProcessStatuses)[number] | string;

export type ProcessItem = {
  id: string;
  registrationId: string;
  trackingNumber: string;
  clientName: string;
  customerName?: string;
  mobile?: string;
  documentType?: string;
  service?: string;
  mainProcess?: string;
  processType: string;
  subPackage?: string;
  registeredOffice?: string;
  currentOffice?: string;
  deliveryLocation?: string;
  country?: string;
  totalAmount?: number;
  registeredDate?: string;
  currentLocation: ProcessLocation;
  status: ProcessStatus;
  receivedDate: string;
  daysHeld: number;
  assignedUserId: string | null;
  assignedToName: string | null;
  remarks: string | null;
  bundleCode?: string;
  fromOfficeName?: string | null;
  toOfficeName?: string | null;
  priority?: string;
};

export type ProcessStats = {
  inbound: number;
  inHand: number;
  completed: number;
  rejected: number;
  outbound: number;
  total: number;
};

export type ProcessDashboardResponse = {
  items: ProcessItem[];
  stats: ProcessStats;
};

export const moveProcessSchema = z.object({
  assignmentId: z.string().optional(),
  trackingNumbers: z.array(z.string()).optional(),
  action: z.enum([
    "COMPLETED",
    "REJECTED",
    "SEND_TO_OFFICE",
    "RECEIVE",
    "RETURN",
    "TRANSFER_TO_HOME",
    "TRANSFER_TO_ASSIGNED_OFFICE",
  ]),
  targetOfficeId: z.string().optional(),
  remarks: z.string().optional(),
});
