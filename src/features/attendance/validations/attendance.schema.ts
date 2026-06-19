import { z } from "zod";

export const checkinSchema = z.object({
  checkinTime: z.string().optional(),
  checkinRemarks: z.string().max(500).optional(),
});

export const checkoutSchema = z.object({
  checkoutTime: z.string().optional(),
  dailySummary: z
    .string()
    .min(10, "Daily summary must be at least 10 characters.")
    .max(2000, "Daily summary cannot exceed 2000 characters."),
});

export const approveSchema = z.object({
  approvedBy: z.string().min(1),
});

export const rejectSchema = z.object({
  rejectionReason: z
    .string()
    .min(5, "Rejection reason must be at least 5 characters.")
    .max(500),
});

export const attendanceSettingSchema = z.object({
  userId: z.string().min(1),
  expectedCheckinTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Time must be in HH:mm format"),
  expectedCheckoutTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Time must be in HH:mm format"),
});

export type CheckinInput = z.infer<typeof checkinSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ApproveInput = z.infer<typeof approveSchema>;
export type RejectInput = z.infer<typeof rejectSchema>;
export type AttendanceSettingInput = z.infer<typeof attendanceSettingSchema>;
