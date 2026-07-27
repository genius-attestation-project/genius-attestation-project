import { z } from "zod";

export const createOfficeSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50, "Username is too long"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  assignedPackages: z.array(z.string()).min(1, "Select at least one package"),
  isActive: z.boolean().default(true),
});

export const updateOfficeSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50, "Username is too long").optional(),
  email: z.string().email("Invalid email address").optional(),
  assignedPackages: z.array(z.string()).min(1, "Select at least one package").optional(),
  isActive: z.boolean().optional(),
});

export const resetOfficePasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type CreateOfficeInput = z.infer<typeof createOfficeSchema>;
export type UpdateOfficeInput = z.infer<typeof updateOfficeSchema>;
export type ResetOfficePasswordInput = z.infer<typeof resetOfficePasswordSchema>;
