import { z } from "zod";

export const accountStatementFiltersSchema = z.object({
  office: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  search: z.string().optional(),
  transactionType: z.enum(["ALL", "CREDIT", "DEBIT"]).optional().default("ALL"),
});

export const updateStatementTransactionSchema = z.object({
  sourceType: z.enum(["ADVANCE_PAYMENT", "ACCOUNT_PANEL"]),
  advanceAmount: z.number().positive().optional(),
  amount: z.number().positive().optional(),
  paymentDate: z.string().optional(),
  transactionDate: z.string().optional(),
  paymentMode: z.string().optional(),
  collectedBy: z.string().optional(),
  narration: z.string().optional(),
  referenceNumber: z.string().optional(),
  invoiceNumber: z.string().optional(),
  bankProofFileId: z.string().optional().nullable(),
  billAttachment: z.string().optional().nullable(),
});

export type AccountStatementFiltersSchema = z.infer<typeof accountStatementFiltersSchema>;
export type UpdateStatementTransactionInput = z.infer<typeof updateStatementTransactionSchema>;
