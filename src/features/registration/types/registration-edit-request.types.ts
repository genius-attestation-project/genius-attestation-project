export type EditRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "FAILED_REVIEW";

export interface FieldChangeItem {
  field: string;
  fieldLabel: string;
  category?: string;
  oldValue: string | number | boolean | null;
  newValue: string | number | boolean | null;
}

export interface RegistrationEditRequestItem {
  id: string;
  registrationId: string;
  trackingNumber: string;
  customerName: string | null;
  documentType: string | null;
  documentName: string | null;
  registrationOffice: string | null;
  currentOffice: string | null;
  originalSnapshot: Record<string, any>;
  proposedSnapshot: Record<string, any>;
  fieldChanges: FieldChangeItem[];
  status: EditRequestStatus;
  requestedById: string | null;
  requestedBy: string | null;
  requestedAt: string;
  approvedById: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedById: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  documentVersion?: string | null;
  documentUpdatedAtSnapshot?: string | null;
  workspaceId?: string | null;
  tenantId?: string | null;
  ownerAdminId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEditRequestParams {
  ownerAdminId: string;
  registrationId: string;
  input: Record<string, any>;
  sourceOfficeName: string;
  requestedById?: string;
  requestedByName?: string;
}

export interface ApproveEditRequestParams {
  ownerAdminId: string;
  id: string;
  approvedById?: string;
  approvedByName?: string;
}

export interface RejectEditRequestParams {
  ownerAdminId: string;
  id: string;
  rejectionReason: string;
  rejectedById?: string;
  rejectedByName?: string;
}
