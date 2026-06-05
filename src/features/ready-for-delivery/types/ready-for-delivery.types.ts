import type { Registration } from "@/features/registration/types/registration.types";

export type ReadyForDeliveryItem = {
  id: string;
  registrationNumber: string;
  clientName: string;
  mobile: string;
  email: string;
  service: string;
  country: string;
  state: string;
  deliveryLocation: string;
  regionOfRegistration: string;
  amount: number;
  workingDays: string;
  source: string;
  leadStatus: string;
  clientType: string;
  createdBy: string;
  acceptedBy: string;
  acceptedAt: string | null;
  acceptedDate: string | null;
  createdAt: string;
  createdDate: string;
  approvalStatus: string;
  bmStatus: string;
  trackingStatus: string;
};

export type ReadyForDeliveryFilters = {
  services: string[];
  countries: string[];
  officeLocations: string[];
};

export type ReadyForDeliveryStats = {
  totalReadyForDelivery: number;
  acceptedToday: number;
  pendingDelivery: number;
  delivered: number;
};

export type ReadyForDeliveryResponse = {
  items: ReadyForDeliveryItem[];
  stats: ReadyForDeliveryStats;
  filters: ReadyForDeliveryFilters;
};

export type ReadyForDeliveryDetail = Registration & {
  acceptedByName: string | null;
  serviceLabel: string;
  amountLabel: string;
  workingDaysLabel: string;
  sourceLabel: string;
  leadStatusLabel: string;
  clientTypeLabel: string;
  officeLocationLabel: string;
};
