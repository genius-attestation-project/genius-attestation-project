import { z } from "zod";

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export const createOfficeSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(50, "Username is too long")
      .regex(/^[a-zA-Z0-9._-]+$/, "Username can only contain letters, numbers, dots, underscores, and hyphens"),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        passwordRegex,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string().min(1, "Please confirm password"),
    processTypes: z.array(z.string()).optional(),
    corePackageId: z.string().optional(),
    subPackages: z.array(z.string()).min(1, "Select at least one Sub Process"),
    status: z.boolean().default(true),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const updateOfficeSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(50, "Username is too long")
      .regex(/^[a-zA-Z0-9._-]+$/, "Username can only contain letters, numbers, dots, underscores, and hyphens")
      .optional(),
    email: z.string().email("Invalid email address").optional(),
    password: z
      .string()
      .optional()
      .refine(
        (val) => !val || val.trim() === "" || (val.length >= 8 && passwordRegex.test(val)),
        "Password must be at least 8 characters and contain uppercase, lowercase, and a number"
      ),
    confirmPassword: z.string().optional(),
    processTypes: z.array(z.string()).optional(),
    corePackageId: z.string().optional(),
    subPackages: z.array(z.string()).min(1, "Select at least one Sub Process").optional(),
    status: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.password && data.password.trim() !== "") {
        return Boolean(data.confirmPassword && data.confirmPassword.trim() !== "");
      }
      return true;
    },
    {
      message: "Confirm Password is required.",
      path: ["confirmPassword"],
    }
  )
  .refine(
    (data) => {
      if (data.password && data.password.trim() !== "") {
        return data.password === data.confirmPassword;
      }
      return true;
    },
    {
      message: "Passwords do not match.",
      path: ["confirmPassword"],
    }
  );

export const resetOfficePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        passwordRegex,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string().min(1, "Please confirm password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type CreateOfficeInput = z.infer<typeof createOfficeSchema>;
export type UpdateOfficeInput = z.infer<typeof updateOfficeSchema>;
export type ResetOfficePasswordInput = z.infer<typeof resetOfficePasswordSchema>;
