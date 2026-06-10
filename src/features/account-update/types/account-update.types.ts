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
  paymentMode: string;
  amountPaid: number;
  invoiceNumber: string;
  paymentDate: string;
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

export type AdminApprovalItem = {
  id: string;
  trackingNumber: string;
  customerName: string;
  processType: string;
  totalCharges: number;
  advancePaid: number;
  balanceAmount: number;
  paymentMode: string;
  invoiceNumber: string;
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
