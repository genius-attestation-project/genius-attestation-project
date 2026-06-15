export type PaymentMode = "Cash" | "Online" | "Cheque";
export type TransactionType = "Cash" | "UPI" | "Cheque";
export type CreditOrDebit = "Credit" | "Debit";

export type RegistrationPaymentLookup = {
  id: string;
  trackingNumber: string;
  customerName: string;
  processType: string;
  totalCharges: number;
  advancePaid: number;
  balanceAmount: number;
};

export type PaymentUpdateItem = RegistrationPaymentLookup & {
  invoiceGroupId: string;
  trackingNumbers: string[];
  registrations: RegistrationPaymentLookup[];
  paymentMode: string;
  amountPaid: number;
  invoiceNumber: string;
  paymentDate: string;
  receiptFileUrl: string | null;
  receiptFileName: string | null;
  receiptMimeType: string | null;
  receiptUploadedAt: string | null;
  receiptUploadedBy: string | null;
  submittedBy: string;
  submittedAt: string;
  approvalStatus: string;
};

export type PaymentUpdateResponse = {
  items: PaymentUpdateItem[];
  stats: {
    pendingPayments: number;
    totalCollectionsToday: number;
  };
};

export type AccountTransactionItem = {
  id: string;
  transactionType: string;
  category: string;
  amount: number;
  creditOrDebit: CreditOrDebit;
  date: string;
  description: string;
  voucherNumber: string;
  createdBy: string;
};

export type AccountTransactionResponse = {
  items: AccountTransactionItem[];
  stats: {
    totalCredits: number;
    totalDebits: number;
  };
};

export type AccountStatementSummary = {
  totalCredit: number;
  totalDebit: number;
  openingBalance: number;
  closingBalance: number;
  netProfitLoss: number;
};

export type AccountStatementLine = {
  id: string;
  date: string;
  trackingNumber: string;
  trackingNumbers: string[];
  invoiceNumber: string;
  voucherNumber: string;
  particulars: string;
  type: CreditOrDebit;
  credit: number;
  debit: number;
  runningBalance: number;
};

export type AccountStatementResponse = {
  creditSummary: Array<{ particulars: string; amount: number }>;
  debitSummary: Array<{ particulars: string; amount: number }>;
  summary: AccountStatementSummary;
  items: AccountStatementLine[];
};

export type AccountTallyItem = {
  id: string;
  invoiceGroupId: string;
  invoiceNumber: string;
  trackingNumbers: string[];
  customerNames: string[];
  processTypes: string[];
  totalCharges: number;
  advancePaid: number;
  amountPaid: number;
  pendingAmount: number;
  paymentMode: string;
  paymentDate: string;
  approvalStatus: string;
};

export type AccountTallyResponse = {
  items: AccountTallyItem[];
  stats: {
    totalCharges: number;
    totalReceived: number;
    totalPending: number;
  };
};

export type AdminApprovalItem = {
  id: string;
  invoiceGroupId: string;
  trackingNumber: string;
  trackingNumbers: string[];
  customerName: string;
  customerNames: string[];
  processType: string;
  processTypes: string[];
  totalCharges: number;
  advancePaid: number;
  balanceAmount: number;
  paymentMode: string;
  invoiceNumber: string;
  paymentDate: string;
  receiptFileUrl: string | null;
  receiptFileName: string | null;
  receiptMimeType: string | null;
  receiptUploadedAt: string | null;
  receiptUploadedBy: string | null;
  submittedBy: string;
  submittedDate: string;
  submittedAt: string | null;
  approvalStatus: string;
};

export type AdminApprovalResponse = {
  items: AdminApprovalItem[];
  stats: {
    pendingApprovals: number;
    approvedToday: number;
    resetRequests: number;
  };
};
