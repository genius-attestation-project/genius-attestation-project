export type RegistrationFileItem = {
  id: string;
  registrationId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  uploadedAt: string;
};

export type AuditTrailItem = {
  id: string;
  registrationId: string;
  action: string;
  description: string;
  performedBy: string | null;
  createdAt: string;
};

export type Registration = {
  id: string;
  trackingNumber: string;
  customerName: string;
  mobile: string;
  email: string | null;
  address: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  customerType: string | null;
  documentType: string | null;
  documentIssuedCountry: string | null;
  processType: string | null;
  externalProcess: string | null;
  priority: string | null;
  committedDuration: string | null;
  deliveryLocation: string | null;
  totalCharges: number;
  advancePaid: number;
  balanceAmount: number;
  paymentMode: string | null;
  paymentStatus: string;
  approvalStatus: string;
  trackingStatus: string;
  createdAt: string;
  updatedAt: string;
  createdDate: string;
  files: RegistrationFileItem[];
  auditTrail: AuditTrailItem[];
};

export type RegistrationFormState = {
  trackingNumber: string;
  customerName: string;
  mobile: string;
  email: string;
  address: string;
  country: string;
  state: string;
  city: string;
  customerType: string;
  documentType: string;
  documentIssuedCountry: string;
  processType: string;
  externalProcess: string;
  priority: string;
  committedDuration: string;
  deliveryLocation: string;
  totalCharges: string;
  advancePaid: string;
  paymentMode: string;
  paymentStatus: string;
  approvalStatus: string;
  trackingStatus: string;
};
