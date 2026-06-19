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

function normalizeTime(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 5);
}

export const attendanceSettingSchema = z
  .object({
    userId: z.string().optional(),
    expectedCheckinTime: z.unknown().optional(),
    expectedCheckoutTime: z.unknown().optional(),
    expectedCheckInTime: z.unknown().optional(),
    expectedCheckOutTime: z.unknown().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.userId?.trim()) {
      ctx.addIssue({ code: "custom", message: "User is required.", path: ["userId"] });
    }

    const checkin = normalizeTime(data.expectedCheckinTime ?? data.expectedCheckInTime);
    const checkout = normalizeTime(data.expectedCheckoutTime ?? data.expectedCheckOutTime);

    if (!checkin) {
      ctx.addIssue({
        code: "custom",
        message: "Check-in time is required.",
        path: ["expectedCheckinTime"],
      });
    } else if (!/^\d{2}:\d{2}$/.test(checkin)) {
      ctx.addIssue({
        code: "custom",
        message: "Check-in time must be in HH:mm format.",
        path: ["expectedCheckinTime"],
      });
    }

    if (!checkout) {
      ctx.addIssue({
        code: "custom",
        message: "Check-out time is required.",
        path: ["expectedCheckoutTime"],
      });
    } else if (!/^\d{2}:\d{2}$/.test(checkout)) {
      ctx.addIssue({
        code: "custom",
        message: "Check-out time must be in HH:mm format.",
        path: ["expectedCheckoutTime"],
      });
    }
  })
  .transform((data) => ({
    userId: data.userId!.trim(),
    expectedCheckinTime: normalizeTime(data.expectedCheckinTime ?? data.expectedCheckInTime),
    expectedCheckoutTime: normalizeTime(data.expectedCheckoutTime ?? data.expectedCheckOutTime),
  }));

export type CheckinInput = z.infer<typeof checkinSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ApproveInput = z.infer<typeof approveSchema>;
export type RejectInput = z.infer<typeof rejectSchema>;
export type AttendanceSettingInput = z.infer<typeof attendanceSettingSchema>;
