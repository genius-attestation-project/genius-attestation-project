export type BmReportItem = {
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
};

export type BmReportStats = {
  totalInward: number;
  totalOutward: number;
  acceptedToday: number;
  pendingInward: number;
};

export type BmReportResponse = {
  items: BmReportItem[];
  stats: BmReportStats;
};
