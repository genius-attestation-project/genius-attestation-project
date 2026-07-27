import { z } from "zod";

export const ProcessLocations = ["IN_HAND", "INBOUND", "COMPLETED", "REJECTED", "SEND_TO_OFFICE", "HOME", "Pending"] as const;
export type ProcessLocation = (typeof ProcessLocations)[number];

export const ProcessStatuses = ["IN_HAND", "INBOUND", "COMPLETED", "REJECTED", "SEND_TO_OFFICE", "HOME", "Pending"] as const;
export type ProcessStatus = (typeof ProcessStatuses)[number];

export type ProcessItem = {
  id: string;
  registrationId: string;
  trackingNumber: string;
  clientName: string;
  processType: string;
  currentLocation: ProcessLocation;
  status: ProcessStatus;
  receivedDate: string;
  daysHeld: number;
  assignedUserId: string | null;
  assignedToName: string | null;
  remarks: string | null;
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
  assignmentId: z.string().min(1, "Assignment ID is required"),
  action: z.enum(["COMPLETED", "REJECTED", "SEND_TO_OFFICE", "RECEIVE", "RETURN"]),
  targetOfficeId: z.string().optional(),
  remarks: z.string().optional(),
});
