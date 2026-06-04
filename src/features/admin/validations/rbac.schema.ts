import { z } from "zod";

import { passwordSchema } from "@/features/auth/validations/auth.schema";

const nullableTrimmedString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : null));

export const roleSchema = z.object({
  name: z.string().trim().min(1, "Role name is required."),
  description: z.string().trim().default(""),
  isActive: z.boolean().default(true),
});

export const rolePermissionSchema = z.object({
  permissionCodes: z.array(z.string().trim()).default([]),
});

export const userSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  email: z.string().trim().email("Email is required."),
  password: passwordSchema.optional(),
  phone: z.string().trim().optional().default(""),
  image: z.string().trim().optional().default(""),
  departmentId: nullableTrimmedString,
  officeLocationId: nullableTrimmedString,
  isActive: z.boolean().default(true),
  roleId: nullableTrimmedString,
});

export const userRoleSchema = z.object({
  roleId: z.string().trim().min(1, "Role is required."),
});

export const resetUserPasswordSchema = z.object({
  password: passwordSchema,
});

export const departmentSchema = z.object({
  name: z.string().trim().min(1, "Department name is required."),
});

export const officeLocationSchema = z.object({
  officeName: z.string().trim().min(1, "Office name is required."),
  location: z.string().trim().min(1, "Location is required."),
  timezone: z.string().trim().min(1, "Timezone is required."),
  employees: z.coerce
    .number()
    .int("Employees must be a whole number.")
    .min(0, "Employees cannot be negative.")
    .default(0),
});
