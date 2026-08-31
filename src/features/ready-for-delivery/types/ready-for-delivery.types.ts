import type { Registration } from "@/features/registration/types/registration.types";

export type ReadyForDeliveryItem = {
  id: string;
  registrationNumber: string;
  compactTrackingNumber: string;
  clientName: string;
  mobile: string;
  email: string;
  service: string;
  country: string;
  state: string;
  deliveryLocation: string;
  regionOfRegistration: string;
  amount: number;
  advancePaid: number;
  balanceAmount: number;
  collectedPerson: string;
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
  registeredDate: string;
  approvalStatus: string;
  bmStatus: string;
  trackingStatus: string;
  deliveryType?: string | null;
  deliveryUserId?: string | null;
  deliveryUserName?: string | null;
  courierCompanyId?: string | null;
  courierCompanyName?: string | null;
  courierTrackingNumber?: string | null;
  deliveryProofFileUrl?: string | null;
  deliveryStatus?: string | null;
  priority?: string | null;
};

export type ReadyForDeliverySection = {
  locationName: string;
  items: ReadyForDeliveryItem[];
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
  sections: ReadyForDeliverySection[];
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
