import { z } from "zod";

export const accountNodeCreateSchema = z.object({
  name: z
    .string()
    .min(1, "Account name is required")
    .max(120, "Account name cannot exceed 120 characters")
    .transform((val) => val.trim()),
  parentId: z.string().nullable().optional(),
  category: z.string().optional(),
  description: z.string().max(500).optional().nullable(),
  code: z.string().max(50).optional().nullable(),
  ledgerMapping: z.string().max(100).optional().nullable(),
  status: z.boolean().optional().default(true),
});

export const accountNodeUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Account name is required")
    .max(120, "Account name cannot exceed 120 characters")
    .transform((val) => val.trim()),
  description: z.string().max(500).optional().nullable(),
  status: z.boolean().optional(),
  code: z.string().max(50).optional().nullable(),
  ledgerMapping: z.string().max(100).optional().nullable(),
});

export const accountNodeSettingsSchema = z.object({
  accountCode: z.string().max(50).optional().nullable(),
  ledgerMapping: z.string().max(100).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  status: z.boolean().optional().default(true),
  customSettings: z.record(z.string(), z.any()).optional().nullable(),
});

export type AccountNodeCreateInput = z.infer<typeof accountNodeCreateSchema>;
export type AccountNodeUpdateInput = z.infer<typeof accountNodeUpdateSchema>;
export type AccountNodeSettingsFormInput = z.infer<typeof accountNodeSettingsSchema>;
