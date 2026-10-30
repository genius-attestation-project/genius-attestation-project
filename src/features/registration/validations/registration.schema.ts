import { z } from "zod";

// We keep system-level status options as enums because they drive hardcoded logic.
// Master data options (Process Types, Document Types, etc.) are now fetched dynamically from the DB via the API.
export const paymentStatusOptions = ["Pending Approval", "Unpaid", "Partially Paid", "Paid"] as const;
export const approvalStatusOptions = ["Pending", "Approved", "Accepted", "Rejected"] as const;

const optionalText = z
  .preprocess((val) => (val === null || val === undefined ? "" : String(val).trim()), z.string())
  .optional()
  .default("");

const requiredText = (label: string, maxLen?: number) =>
  z
    .preprocess((val) => (val === null || val === undefined ? "" : String(val).trim()), z.string())
    .refine((val) => val.length > 0, `${label} is required.`)
    .refine((val) => !maxLen || val.length <= maxLen, `${label} cannot exceed ${maxLen} characters.`);

const optionalEmail = z
  .preprocess((val) => (val === null || val === undefined ? "" : String(val).trim()), z.string())
  .refine((val) => val === "" || z.string().email().safeParse(val).success, "Enter a valid email address.")
  .optional()
  .default("");

const optionalPhone = z
  .preprocess((val) => (val === null || val === undefined ? "" : String(val).trim()), z.string())
  .transform((value) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    if (value.startsWith("+")) return `+${digits}`;
    if (digits.length === 10) return `+91${digits}`;
    return `+${digits}`;
  })
  .refine((value) => {
    if (!value) return true;
    const digits = value.replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 15;
  }, "Enter a valid mobile number")
  .optional()
  .default("");

const numericField = (label: string, required = false) =>
  z.preprocess((val) => {
    if (val === null || val === undefined || val === "") return required ? undefined : 0;
    if (typeof val === "number") return val;
    if (typeof val === "string") {
      const cleaned = val.replace(/[^0-9.-]/g, "").trim();
      return cleaned === "" ? (required ? undefined : 0) : Number(cleaned);
    }
    return val;
  }, z.number({ message: `${label} must be a valid number.` }).min(0, `${label} cannot be negative.`));

export const registrationInputSchema = z.object({
  trackingNumber: requiredText("Tracking number"),
  customerName: optionalText,
  mobile: optionalPhone,
  email: optionalEmail,
  address: optionalText,
  country: optionalText,
  state: optionalText,
  city: optionalText,
  customerType: optionalText,
  corporateDetailId: optionalText,
  documentType: optionalText,
  documentName: optionalText,
  documentIssuedCountry: optionalText,
  processType: optionalText,
  subPackage: optionalText,
  externalProcess: optionalText,
  priority: optionalText,
  committedDuration: optionalText,
  deliveryLocation: optionalText,
  totalCharges: numericField("Total charges", false),
  advancePaid: numericField("Advance paid", false),
  requestedAdvanceAmount: numericField("Requested advance amount", false),
  paymentMode: optionalText,
  upiTransactionId: optionalText,
  bankName: optionalText,
  transactionRefNo: optionalText,
  transferDate: optionalText,
  chequeNumber: optionalText,
  chequeDate: optionalText,
  ddNumber: optionalText,
  ddDate: optionalText,
  cardLast4: optionalText,
  approvalCode: optionalText,
  paymentGateway: optionalText,
  onlineTransactionId: optionalText,
  walletName: optionalText,
  walletTransactionId: optionalText,
  paymentReferenceNo: optionalText,
  paymentDescription: optionalText,
  paymentStatus: optionalText,
  collectedPerson: optionalText,
  commissionToUserId: optionalText,
  commissionToName: optionalText,
  commissionToEmail: optionalText,
  registeredPerson: optionalText,
  regionOfRegistration: optionalText,
  regionOfRegistrationId: optionalText,
  approvalStatus: z.preprocess(
    (val) => (val && approvalStatusOptions.includes(val as any) ? val : "Pending"),
    z.enum(approvalStatusOptions),
  ).optional().default("Pending"),
  trackingStatus: optionalText,
  leadId: optionalText,
  documentFileIds: z.array(z.string()).optional().default([]),
  invoiceFileIds: z.array(z.string()).optional().default([]),
  supportingFileIds: z.array(z.string()).optional().default([]),
  advancePaymentFileIds: z.array(z.string()).optional().default([]),
  isSwap: z.boolean().optional().default(false),
  targetRegistrationId: optionalText,
  targetTrackingNumber: optionalText,
}).refine((data) => (data.requestedAdvanceAmount ?? data.advancePaid ?? 0) <= (data.totalCharges ?? 0), {
  message: "Advance payment cannot exceed Total Charges.",
  path: ["requestedAdvanceAmount"],
});

export type RegistrationSchemaType = z.infer<typeof registrationInputSchema>;
export type RegistrationInput = {
  trackingNumber: string;
  customerName?: string;
  mobile?: string;
  email?: string;
  address?: string;
  country?: string;
  state?: string;
  city?: string;
  customerType?: string;
  corporateDetailId?: string;
  documentType?: string;
  documentName?: string;
  documentIssuedCountry?: string;
  processType?: string;
  subPackage?: string;
  externalProcess?: string;
  priority?: string;
  committedDuration?: string;
  deliveryLocation?: string;
  totalCharges?: number;
  advancePaid?: number;
  requestedAdvanceAmount?: number;
  paymentMode?: string;
  upiTransactionId?: string;
  bankName?: string;
  transactionRefNo?: string;
  transferDate?: string;
  chequeNumber?: string;
  chequeDate?: string;
  ddNumber?: string;
  ddDate?: string;
  cardLast4?: string;
  approvalCode?: string;
  paymentGateway?: string;
  onlineTransactionId?: string;
  walletName?: string;
  walletTransactionId?: string;
  paymentReferenceNo?: string;
  paymentDescription?: string;
  paymentStatus?: string;
  collectedPerson?: string;
  commissionToUserId?: string;
  commissionToName?: string;
  commissionToEmail?: string;
  registeredPerson?: string;
  regionOfRegistration?: string;
  regionOfRegistrationId?: string;
  approvalStatus?: (typeof approvalStatusOptions)[number];
  trackingStatus?: string;
  leadId?: string;
  documentFileIds?: string[];
  invoiceFileIds?: string[];
  supportingFileIds?: string[];
  advancePaymentFileIds?: string[];
  isSwap?: boolean;
  targetRegistrationId?: string;
  targetTrackingNumber?: string;
};

export const documentItemInputSchema = z.object({
  trackingNumber: requiredText("Tracking number"),
  documentType: optionalText,
  documentName: optionalText,
  documentIssuedCountry: optionalText,
  processType: optionalText,
  subPackage: optionalText,
  externalProcess: optionalText,
  priority: optionalText,
  committedDuration: optionalText,
  deliveryLocation: optionalText,
  totalCharges: numericField("Total charges", false),
  advancePaid: numericField("Advance paid", false),
  requestedAdvanceAmount: numericField("Requested advance amount", false),
  paymentMode: optionalText,
  upiTransactionId: optionalText,
  bankName: optionalText,
  transactionRefNo: optionalText,
  transferDate: optionalText,
  chequeNumber: optionalText,
  chequeDate: optionalText,
  ddNumber: optionalText,
  ddDate: optionalText,
  cardLast4: optionalText,
  approvalCode: optionalText,
  paymentGateway: optionalText,
  onlineTransactionId: optionalText,
  walletName: optionalText,
  walletTransactionId: optionalText,
  paymentReferenceNo: optionalText,
  paymentDescription: optionalText,
  paymentStatus: optionalText,
  collectedPerson: optionalText,
  commissionToUserId: optionalText,
  commissionToName: optionalText,
  commissionToEmail: optionalText,
  registeredPerson: optionalText,
  regionOfRegistration: optionalText,
  regionOfRegistrationId: optionalText,
  approvalStatus: z.preprocess(
    (val) => (val && approvalStatusOptions.includes(val as any) ? val : "Pending"),
    z.enum(approvalStatusOptions),
  ).optional().default("Pending"),
  trackingStatus: optionalText,
  documentFileIds: z.array(z.string()).optional().default([]),
  invoiceFileIds: z.array(z.string()).optional().default([]),
  supportingFileIds: z.array(z.string()).optional().default([]),
  advancePaymentFileIds: z.array(z.string()).optional().default([]),
}).refine((data) => (data.requestedAdvanceAmount ?? data.advancePaid ?? 0) <= (data.totalCharges ?? 0), {
  message: "Advance payment cannot exceed Total Charges.",
  path: ["requestedAdvanceAmount"],
});

export type DocumentItemSchemaType = z.infer<typeof documentItemInputSchema>;
export type DocumentItemInput = {
  trackingNumber: string;
  documentType?: string;
  documentName?: string;
  documentIssuedCountry?: string;
  processType?: string;
  subPackage?: string;
  externalProcess?: string;
  priority?: string;
  committedDuration?: string;
  deliveryLocation?: string;
  totalCharges?: number;
  advancePaid?: number;
  requestedAdvanceAmount?: number;
  paymentMode?: string;
  upiTransactionId?: string;
  bankName?: string;
  transactionRefNo?: string;
  transferDate?: string;
  chequeNumber?: string;
  chequeDate?: string;
  ddNumber?: string;
  ddDate?: string;
  cardLast4?: string;
  approvalCode?: string;
  paymentGateway?: string;
  onlineTransactionId?: string;
  walletName?: string;
  walletTransactionId?: string;
  paymentReferenceNo?: string;
  paymentDescription?: string;
  paymentStatus?: string;
  collectedPerson?: string;
  commissionToUserId?: string;
  commissionToName?: string;
  commissionToEmail?: string;
  registeredPerson?: string;
  regionOfRegistration?: string;
  regionOfRegistrationId?: string;
  approvalStatus?: (typeof approvalStatusOptions)[number];
  trackingStatus?: string;
  documentFileIds?: string[];
  invoiceFileIds?: string[];
  supportingFileIds?: string[];
  advancePaymentFileIds?: string[];
};

export const sharedCustomerInputSchema = z.object({
  leadId: optionalText,
  customerName: optionalText,
  mobile: optionalPhone,
  email: optionalEmail,
  address: optionalText,
  country: optionalText,
  state: optionalText,
  city: optionalText,
  customerType: optionalText,
  corporateDetailId: optionalText,
});

export type SharedCustomerSchemaType = z.infer<typeof sharedCustomerInputSchema>;
export type SharedCustomerInput = {
  leadId?: string;
  customerName?: string;
  mobile?: string;
  email?: string;
  address?: string;
  country?: string;
  state?: string;
  city?: string;
  customerType?: string;
  corporateDetailId?: string;
};

export const multiRegistrationInputSchema = z.object({
  shared: sharedCustomerInputSchema,
  documents: z.array(documentItemInputSchema).min(1, "At least one document is required."),
}).refine((data) => {
  const numbers = data.documents.map((d) => d.trackingNumber.trim().toLowerCase());
  const seen = new Set<string>();
  for (const num of numbers) {
    if (seen.has(num)) return false;
    seen.add(num);
  }
  return true;
}, {
  message: "Duplicate Tracking Numbers found in submission. Each document must have a unique Tracking Number.",
  path: ["documents"],
});

export type MultiRegistrationSchemaType = z.infer<typeof multiRegistrationInputSchema>;
export type MultiRegistrationInput = {
  shared: SharedCustomerInput;
  documents: DocumentItemInput[];
};

