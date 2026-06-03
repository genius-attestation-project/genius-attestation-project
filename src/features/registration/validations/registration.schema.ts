import { z } from "zod";

export const documentTypeOptions = [
  "Education",
  "Degree",
  "Birth Certificate",
  "Non-Education",
  "Commercial",
  "Other",
] as const;

export const processTypeOptions = ["Apostille", "Attestation", "Translation", "Embassy"] as const;
export const externalProcessOptions = ["MOFA", "Home Department", "Embassy", "Other"] as const;
export const priorityOptions = ["Normal", "Express", "Super Fast"] as const;
export const paymentModeOptions = ["Cash", "UPI", "Bank Transfer", "Card", "Corporate"] as const;
export const paymentStatusOptions = ["Pending", "Partially Paid", "Paid"] as const;
export const approvalStatusOptions = ["Pending", "Approved", "Rejected"] as const;

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
  state: requiredText("State"),
  city: requiredText("City"),
  customerType: requiredText("Customer type"),
  documentType: requiredText("Document type"),
  documentIssuedCountry: requiredText("Document issued country"),
  processType: requiredText("Process type"),
  externalProcess: requiredText("Address process"),
  priority: requiredText("Special processing priority"),
  committedDuration: requiredText("Committed duration / SLA"),
  deliveryLocation: requiredText("Delivery location"),
  totalCharges: numericField("Total charges", false),
  advancePaid: numericField("Advance paid", false),
  paymentMode: requiredText("Payment mode"),
  paymentStatus: z.enum(paymentStatusOptions).optional().default("Pending"),
  collectedPerson: optionalText,
  registeredPerson: optionalText,
  regionOfRegistration: optionalText,
  approvalStatus: z.enum(approvalStatusOptions).optional().default("Pending"),
  trackingStatus: optionalText,
});

export type RegistrationInput = z.infer<typeof registrationInputSchema>;
