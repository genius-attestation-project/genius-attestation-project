import { z } from "zod";

export const salaryPayrollStatusSchema = z.enum(["Draft", "Generated", "Approved", "Paid"]);

function toOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return Number.NaN;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function salaryMonthSchema(message: string) {
  return z
    .unknown()
    .transform(toOptionalNumber)
    .refine((value) => value === undefined || (Number.isInteger(value) && value >= 1 && value <= 12), {
      message,
    })
    .transform((value) => value as number | undefined);
}

function salaryYearSchema(message: string) {
  return z
    .unknown()
    .transform(toOptionalNumber)
    .refine((value) => value === undefined || (Number.isInteger(value) && value >= 1970), {
      message,
    })
    .transform((value) => value as number | undefined);
}

function optionalTrimmedString(message: string) {
  return z
    .unknown()
    .transform((value) => (typeof value === "string" ? value.trim() : ""))
    .refine((value) => value === "" || value.length > 0, { message })
    .transform((value) => (value === "" ? undefined : value));
}

export const salaryMonthYearQuerySchema = z
  .object({
    month: salaryMonthSchema("Month must be between 1 and 12."),
    year: salaryYearSchema("Year must be a valid number."),
  })
  .transform((data) => ({
    month: data.month,
    year: data.year,
  }));

export const salaryCalculateQuerySchema = z
  .object({
    month: salaryMonthSchema("Month must be between 1 and 12."),
    year: salaryYearSchema("Year must be a valid number."),
    userId: optionalTrimmedString("User ID must be a non-empty string."),
  })
  .transform((data) => ({
    month: data.month,
    year: data.year,
    userId: data.userId,
  }));

export const salaryReportsQuerySchema = z
  .object({
    month: salaryMonthSchema("Month must be between 1 and 12."),
    year: salaryYearSchema("Year must be a valid number."),
    userId: optionalTrimmedString("User ID must be a non-empty string."),
    status: salaryPayrollStatusSchema.optional(),
  })
  .transform((data) => ({
    month: data.month,
    year: data.year,
    userId: data.userId,
    status: data.status,
  }));

export const salaryGenerateSchema = z
  .object({
    month: salaryMonthSchema("Month must be between 1 and 12.").optional(),
    year: salaryYearSchema("Year must be a valid year.").optional(),
    userId: optionalTrimmedString("User ID must be a non-empty string."),
    notes: z
      .unknown()
      .transform((value) => (typeof value === "string" ? value.trim() : ""))
      .transform((value) => (value === "" ? undefined : value))
      .optional(),
  })
  .transform((data) => ({
    month: data.month,
    year: data.year,
    userId: data.userId,
    notes: data.notes,
  }));

export const salaryApproveSchema = z.object({
  payrollId: z.string().trim().min(1, "Payroll ID is required."),
});

export type SalaryMonthYearQuery = z.infer<typeof salaryMonthYearQuerySchema>;
export type SalaryCalculateQuery = z.infer<typeof salaryCalculateQuerySchema>;
export type SalaryReportsQuery = z.infer<typeof salaryReportsQuerySchema>;
export type SalaryGenerateInput = z.infer<typeof salaryGenerateSchema>;
export type SalaryApproveInput = z.infer<typeof salaryApproveSchema>;
