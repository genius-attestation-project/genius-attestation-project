export interface AccountStatementItem {
  id: string; // Unique ID (e.g. advance approval ID or account panel transaction ID)
  sourceType: "ADVANCE_PAYMENT" | "ACCOUNT_PANEL";
  slNo?: number;
  date: string; // YYYY-MM-DD format or ISO string
  collectedBy: string; // Registrar / Collected By / Created By
  invoiceNumber: string; // Tracking No or Invoice No
  amount: number;
  paymentMode?: string;
  narration?: string;
  proofFileUrl?: string | null;
  proofFileName?: string | null;
  bankProofFileUrl?: string | null;
  bankProofFileName?: string | null;
  accountId?: string | null;
  accountName?: string | null;
  officeId?: string | null;
  officeName?: string | null;
  canEdit?: boolean;
  canDelete?: boolean;
}

export interface DebitAccountGroup {
  accountName: string;
  subTotal: number;
  items: AccountStatementItem[];
}

export interface AccountStatementsData {
  office: string;
  fromDate: string;
  toDate: string;
  openingBalance: number;
  credit: {
    advances: AccountStatementItem[];
    advancesTotal: number;
    moreAdvances: AccountStatementItem[];
    moreAdvancesTotal: number;
    panelCredits: AccountStatementItem[];
    panelCreditsTotal: number;
    creditTotal: number;
  };
  debit: {
    groups: DebitAccountGroup[];
    debitTotal: number;
  };
  cashInHand: number;
}

export interface AccountStatementFiltersInput {
  office?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  transactionType?: string;
}
