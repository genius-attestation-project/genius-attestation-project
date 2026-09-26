export interface AccountApprovalItem {
  id: string;
  targetId: string;
  sourceType: "ADVANCE_PAYMENT" | "ACCOUNT_PANEL";
  office: string | null;
  officeId: string | null;
  customerName: string | null;
  trackingNumber: string | null;

  // Before Data
  oldAmount: number;
  oldDate: string;
  oldPaymentMode: string | null;
  oldBankName: string | null;
  oldCollectedBy: string | null;
  oldInvoiceNumber: string | null;
  oldRemarks: string | null;
  oldProofFileId: string | null;
  oldProofFileUrl: string | null;
  oldProofFileName: string | null;

  // After Data (Proposed)
  newAmount: number;
  newDate: string;
  newPaymentMode: string | null;
  newBankName: string | null;
  newCollectedBy: string | null;
  newInvoiceNumber: string | null;
  newRemarks: string | null;
  newProofFileId: string | null;
  newProofFileUrl: string | null;
  newProofFileName: string | null;

  // Status & Audit
  status: string; // "Pending" | "Approved" | "Rejected"
  requestedById: string | null;
  requestedByName: string | null;
  requestedAt: string;
  approvedById: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  rejectedById: string | null;
  rejectedByName: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  approvalRemarks: string | null;
}

export interface CreateAccountApprovalParams {
  ownerAdminId: string;
  targetId: string;
  sourceType: "ADVANCE_PAYMENT" | "ACCOUNT_PANEL";
  userId: string;
  userName?: string;
  office?: string | null;
  officeId?: string | null;
  customerName?: string | null;
  trackingNumber?: string | null;

  oldAmount: number;
  oldDate: string | Date;
  oldPaymentMode?: string | null;
  oldBankName?: string | null;
  oldCollectedBy?: string | null;
  oldInvoiceNumber?: string | null;
  oldRemarks?: string | null;
  oldProofFileId?: string | null;
  oldProofFileUrl?: string | null;
  oldProofFileName?: string | null;

  newAmount: number;
  newDate: string | Date;
  newPaymentMode?: string | null;
  newBankName?: string | null;
  newCollectedBy?: string | null;
  newInvoiceNumber?: string | null;
  newRemarks?: string | null;
  newProofFileId?: string | null;
  newProofFileUrl?: string | null;
  newProofFileName?: string | null;

  beforeSnapshot?: any;
  afterSnapshot?: any;
}

export interface ListAccountApprovalParams {
  ownerAdminId: string;
  status?: string;
  office?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  isSuperAdmin?: boolean;
  allowedOfficeIds?: string[] | null;
  allowedOfficeNames?: string[] | null;
}

export interface ApproveAccountApprovalParams {
  id: string;
  ownerAdminId: string;
  userId: string;
  userName?: string;
  approvalRemarks?: string;
  isSuperAdmin?: boolean;
  allowedOfficeIds?: string[] | null;
  allowedOfficeNames?: string[] | null;
}

export interface RejectAccountApprovalParams {
  id: string;
  ownerAdminId: string;
  userId: string;
  userName?: string;
  rejectionReason: string;
  isSuperAdmin?: boolean;
  allowedOfficeIds?: string[] | null;
  allowedOfficeNames?: string[] | null;
}
