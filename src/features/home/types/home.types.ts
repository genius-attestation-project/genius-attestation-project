export type HomeItem = {
  id: string;
  registrationNumber: string;
  clientName: string;
  service: string;
  sourceOffice: string;
  deliveryLocation: string;
  createdBy: string;
  createdDate: string;
  status: string;
  acceptedAt: string | null;
  acceptedDate: string | null;
  acceptedBy: string | null;
  isBmLocked: boolean;
  bmExtensionStatus: string | null;
};

export type HomeStats = {
  totalInward: number;
  totalOutward: number;
  acceptedToday: number;
  pendingInward: number;
};
