import { z } from "zod";

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

const requiredEmail = (label: string) =>
  z
    .preprocess((val) => (val === null || val === undefined ? "" : String(val).trim()), z.string())
    .refine((val) => val.length > 0, `${label} is required.`)
    .refine((val) => z.string().email().safeParse(val).success, "Enter a valid email address.");

const mobileNumber = z
  .preprocess((val) => (val === null || val === undefined ? "" : String(val).trim()), z.string())
  .transform((value) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    if (value.startsWith("+")) return `+${digits}`;
    if (digits.length === 10) return `+91${digits}`;
    return `+${digits}`;
  })
  .refine((value) => {
    const digits = value.replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 15;
  }, "Enter a valid mobile number");

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
  customerName: requiredText("Customer name"),
  mobile: mobileNumber,
  email: requiredEmail("Email"),
  address: requiredText("Address"),
  country: requiredText("Country"),
  state: optionalText,
  city: optionalText,
  customerType: requiredText("Customer type"),
  corporateDetailId: optionalText,
  documentType: requiredText("Document type"),
  documentName: requiredText("Document name", 255),
  documentIssuedCountry: requiredText("Document issued country"),
  processType: requiredText("Process type"),
  subPackage: optionalText,
  externalProcess: requiredText("Additional process"),
  priority: requiredText("Special processing priority"),
  committedDuration: requiredText("Committed duration / SLA"),
  deliveryLocation: requiredText("Delivery location"),
  totalCharges: numericField("Total charges", false),
  advancePaid: numericField("Advance paid", false),
  requestedAdvanceAmount: numericField("Requested advance amount", false),
  paymentMode: requiredText("Payment mode"),
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
  approvalStatus: z.preprocess(
    (val) => (val && approvalStatusOptions.includes(val as any) ? val : "Pending"),
    z.enum(approvalStatusOptions),
  ).optional().default("Pending"),
  trackingStatus: optionalText,
  leadId: optionalText,
}).refine((data) => (data.requestedAdvanceAmount ?? data.advancePaid ?? 0) <= data.totalCharges, {
  message: "Advance payment cannot exceed Total Charges.",
  path: ["advancePaid"],
});

export type RegistrationInput = z.infer<typeof registrationInputSchema>;
