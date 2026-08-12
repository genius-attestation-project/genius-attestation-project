import { z } from "zod";

// We keep system-level status options as enums because they drive hardcoded logic.
// Master data options (Process Types, Document Types, etc.) are now fetched dynamically from the DB via the API.
export const paymentStatusOptions = ["Pending Approval", "Unpaid", "Partially Paid", "Paid"] as const;
export const approvalStatusOptions = ["Pending", "Approved", "Accepted", "Rejected"] as const;

const optionalText = z.string().trim().optional().default("");
const requiredText = (label: string) => z.string().trim().min(1, `${label} is required.`);
const mobileNumber = z
  .string()
  .transform((value) => {
    const hasPrefix = value.trim().startsWith("+");
    const digits = value.replace(/\D/g, "");
    return digits ? `${hasPrefix ? "+" : ""}${digits}` : "";
  })
  .refine((value) => {
    const digits = value.replace(/\D/g, "");
    if (!value.startsWith("+") || digits.length < 7 || digits.length > 15) return false;
    if (value.startsWith("+91")) return digits.slice(2).length === 10;
    return true;
  }, "Enter a valid mobile number");

const numericField = (label: string, required = true) =>
  z.union([
    z.number(),
    z.string().transform((value, ctx) => {
      const normalized = value.replace(/,/g, "").trim();
      const parsed = Number(normalized);

      if (!normalized) {
        if (required) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${label} is required.`,
          });
          return z.NEVER;
        }

        return 0;
      }

      if (Number.isNaN(parsed)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} must be a valid number.`,
        });
        return z.NEVER;
      }

      return parsed;
    }),
  ]).refine((value) => value >= 0, `${label} cannot be negative.`);

export const registrationInputSchema = z.object({
  trackingNumber: z.string().trim().min(1, "Tracking number is required."),
  customerName: z.string().trim().min(1, "Customer name is required."),
  mobile: mobileNumber,
  email: requiredText("Email").email("Enter a valid email address."),
  address: requiredText("Address"),
  country: requiredText("Country"),
  state: optionalText,
  city: optionalText,
  customerType: requiredText("Customer type"),
  documentType: requiredText("Document type"),
  documentName: requiredText("Document name").max(255, "Document name cannot exceed 255 characters."),
  documentIssuedCountry: requiredText("Document issued country"),
  processType: requiredText("Process type"),
  subPackage: optionalText,
  externalProcess: requiredText("Address process"),
  priority: requiredText("Special processing priority"),
  committedDuration: requiredText("Committed duration / SLA"),
  deliveryLocation: requiredText("Delivery location"),
  totalCharges: numericField("Total charges", false),
  advancePaid: numericField("Advance paid", false),
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
  paymentStatus: z.string().optional(),
  collectedPerson: optionalText,
  commissionToUserId: optionalText,
  commissionToName: optionalText,
  commissionToEmail: optionalText,
  registeredPerson: optionalText,
  regionOfRegistration: optionalText,
  approvalStatus: z.enum(approvalStatusOptions).optional().default("Pending"),
  trackingStatus: optionalText,
  leadId: optionalText,
}).refine((data) => data.advancePaid <= data.totalCharges, {
  message: "Advance Paid cannot exceed Total Charges.",
  path: ["advancePaid"],
});

export type RegistrationInput = z.infer<typeof registrationInputSchema>;
