import { z } from "zod";

export const leadStatusOptions = [
  "New",
  "Qualified",
  "Potential Qualified",
  "Closed",
  "LOB",
] as const;

const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (typeof value === "string" && value.trim() === "") {
      return undefined;
    }

    return value;
  }, schema.optional());

const numericString = emptyToUndefined(
  z.union([
    z.number(),
    z.string().transform((value, ctx) => {
      const normalized = value.replace(/,/g, "").trim();

      if (!normalized) {
        return 0;
      }

      const amount = Number(normalized);

      if (Number.isNaN(amount)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Amount must be a valid number.",
        });
        return z.NEVER;
      }

      return amount;
    }),
  ]),
);

const integerString = emptyToUndefined(
  z.union([
    z.number().int().nonnegative(),
    z.string().transform((value, ctx) => {
      const normalized = value.trim();

      if (!normalized) {
        return 0;
      }

      const parsed = Number.parseInt(normalized, 10);

      if (Number.isNaN(parsed) || parsed < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Value must be a valid positive number.",
        });
        return z.NEVER;
      }

      return parsed;
    }),
  ]),
);

export const leadInputSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().optional().default(""),
  countryCode: z.string().trim().min(1, "Country code is required."),
  mobileNumber: z.string().trim().min(1, "Mobile number is required."),
  email: z.string().trim().email("Email is required."),
  docType: z.string().trim().optional().default(""),
  noOfDocuments: integerString,
  country: z.string().trim().min(1, "Country is required."),
  state: z.string().trim().optional().default(""),
  documentIssuedCountry: z.string().trim().optional().default(""),
  service: z.string().trim().min(1, "Service is required."),
  source: z.string().trim().optional().default(""),
  leadStatus: z.enum(leadStatusOptions, "Lead status is required."),
  clientType: z.string().trim().optional().default(""),
  amount: numericString,
  workingDays: integerString,
  remark: z.string().trim().optional().default(""),
  assignedUserId: z.string().trim().optional().default(""),
  assignedUser: z.string().trim().optional().default(""),
  nextFollowupAt: emptyToUndefined(
    z.union([
      z.date(),
      z.string().transform((value, ctx) => {
        const parsed = new Date(value);

        if (Number.isNaN(parsed.getTime())) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Followup date must be valid.",
          });
          return z.NEVER;
        }

        return parsed;
      }),
    ]),
  ),
});

export type LeadInput = z.infer<typeof leadInputSchema>;
