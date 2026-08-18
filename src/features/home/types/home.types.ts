export type HomeItem = {
  id: string;
  trackingNumber?: string;
  registrationNumber: string;
  customerName?: string;
  clientName: string;
  mobile?: string;
  documentType?: string;
  processType?: string;
  mainProcess?: string;
  subPackage?: string;
  service: string;
  sourceOffice: string;
  regionOfRegistration?: string;
  deliveryLocation: string;
  totalCharges?: number;
  createdBy: string;
  createdDate: string;
  createdAt?: Date | string;
  status: string;
  trackingStatus?: string;
  acceptedAt: string | null;
  acceptedDate: string | null;
  acceptedBy: string | null;
  isBmLocked: boolean;
  bmExtensionStatus: string | null;
  advancePaid?: number;
  movementApproved?: boolean;
};

export type HomeStats = {
  totalInward: number;
  totalOutward: number;
  acceptedToday: number;
  pendingInward: number;
};
