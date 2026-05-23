import { z } from "zod";

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
  department: z.string().trim().optional().default(""),
  officeLocation: z.string().trim().optional().default(""),
  isActive: z.boolean().default(true),
  roleId: z.string().trim().nullable().optional(),
});

export const userRoleSchema = z.object({
  roleId: z.string().trim().min(1, "Role is required."),
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
