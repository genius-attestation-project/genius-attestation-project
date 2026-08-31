import { z } from "zod";

import { LEAVE_TYPES } from "@/features/leave/types/leave.types";

const leaveTypeValues = [...LEAVE_TYPES] as [string, ...string[]];

export const applyLeaveSchema = z
  .object({
    leaveType: z.enum(leaveTypeValues, { message: "Select a leave type." }),
    fromDate: z.string().min(1, "From date is required."),
    toDate: z.string().min(1, "To date is required."),
    reason: z.string().trim().min(5, "Reason must be at least 5 characters.").max(2000),
    attachmentUrl: z.string().trim().url("Attachment must be a valid URL.").optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const from = new Date(data.fromDate);
    const to = new Date(data.toDate);

    if (Number.isNaN(from.getTime())) {
      ctx.addIssue({ code: "custom", message: "From date is invalid.", path: ["fromDate"] });
    }

    if (Number.isNaN(to.getTime())) {
      ctx.addIssue({ code: "custom", message: "To date is invalid.", path: ["toDate"] });
    }

    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && to < from) {
      ctx.addIssue({ code: "custom", message: "To date must be on or after from date.", path: ["toDate"] });
    }
  })
  .transform((data) => ({
    leaveType: data.leaveType,
    fromDate: data.fromDate,
    toDate: data.toDate,
    reason: data.reason.trim(),
    attachmentUrl: data.attachmentUrl?.trim() ? data.attachmentUrl.trim() : null,
  }));

export const leaveDecisionSchema = z.object({
  note: z.string().trim().min(3).max(1000),
});

export const leaveCancelSchema = z.object({
  note: z.string().trim().min(3).max(1000).optional().default("Cancelled by user."),
});

export type ApplyLeaveInput = z.infer<typeof applyLeaveSchema>;
export type LeaveDecisionInput = z.infer<typeof leaveDecisionSchema>;
export type LeaveCancelInput = z.infer<typeof leaveCancelSchema>;
