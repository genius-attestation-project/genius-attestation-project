import { z } from "zod";

export const createAccountPanelTransactionSchema = z.object({
  accountId: z.string().min(1, "Account ID is required"),
  invoiceNumber: z.string().optional().nullable(),
  billAttachment: z.string().optional().nullable(),
  transactionDate: z.string().or(z.date()),
  amount: z
    .number({ message: "Amount must be a number" })
    .positive("Amount must be a positive number greater than 0"),
  narration: z.string().optional().nullable(),
  officeId: z.string().optional().nullable(),
});

export type CreateAccountPanelTransactionInput = z.infer<
  typeof createAccountPanelTransactionSchema
>;
