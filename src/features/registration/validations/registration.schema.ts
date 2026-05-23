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

const numericField = (label: string) =>
  z.union([
    z.number(),
    z.string().transform((value, ctx) => {
      const normalized = value.replace(/,/g, "").trim();
      const parsed = normalized ? Number(normalized) : 0;

      if (Number.isNaN(parsed)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} must be a valid number.`,
        });
        return z.NEVER;
      }

      return parsed;
    }),
  ]);

export const registrationInputSchema = z.object({
  trackingNumber: z.string().trim().min(1, "Tracking number is required."),
  customerName: z.string().trim().min(1, "Customer name is required."),
  mobile: z.string().trim().min(1, "Mobile number is required."),
  email: optionalText,
  address: optionalText,
  country: optionalText,
  state: optionalText,
  city: optionalText,
  customerType: optionalText,
  documentType: optionalText,
  documentIssuedCountry: optionalText,
  processType: optionalText,
  externalProcess: optionalText,
  priority: optionalText,
  committedDuration: optionalText,
  deliveryLocation: optionalText,
  totalCharges: numericField("Total charges"),
  advancePaid: numericField("Advance paid"),
  paymentMode: optionalText,
  paymentStatus: z.enum(paymentStatusOptions).optional().default("Pending"),
  approvalStatus: z.enum(approvalStatusOptions).optional().default("Pending"),
  trackingStatus: optionalText,
});

export type RegistrationInput = z.infer<typeof registrationInputSchema>;
