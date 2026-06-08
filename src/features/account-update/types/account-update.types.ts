export type PaymentUpdateItem = {
  id: string;
  trackingNumber: string;
  customerName: string;
  processType: string;
  totalCharges: number;
  advancePaid: number;
  balanceAmount: number;
  paymentMode: string;
  registrationDate: string;
  paymentUpdateStatus: string;
};

export type PaymentUpdateResponse = {
  items: PaymentUpdateItem[];
  stats: {
    pendingCollections: number;
    totalBalanceDue: number;
  };
};

export type AccountTallyItem = {
  id: string;
  trackingNumber: string;
  credit: number;
  debit: number;
  pendingAmount: number;
};

export type AccountTallyResponse = {
  items: AccountTallyItem[];
  stats: {
    totalCredit: number;
    totalDebit: number;
    totalPending: number;
  };
};

export type AdminApprovalItem = {
  id: string;
  trackingNumber: string;
  customerName: string;
  processType: string;
  totalCharges: number;
  advancePaid: number;
  balanceAmount: number;
  submittedBy: string;
  submittedDate: string;
  submittedAt: string | null;
  financeApprovalStatus: string;
  rejectionReason: string | null;
};

export type AdminApprovalResponse = {
  items: AdminApprovalItem[];
  stats: {
    pendingApprovals: number;
    approvedToday: number;
    rejectedToday: number;
  };
};
