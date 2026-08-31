import { z } from "zod";

import { FOLLOWUP_PAST_VALIDATION_MESSAGE } from "@/features/lead/validations/lead.schema";

export const snoozeFollowupSchema = z.object({
  leadId: z.string().trim().min(1, "Lead ID is required."),
  nextFollowupAt: z.union([
    z.date(),
    z.string().transform((value, ctx) => {
      const parsed = new Date(value);

      if (Number.isNaN(parsed.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Followup date and time must be valid.",
        });
        return z.NEVER;
      }

      return parsed;
    }),
  ]),
  description: z.string().trim().optional().default(""),
}).superRefine((value, ctx) => {
  if (value.nextFollowupAt.getTime() < Date.now()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["nextFollowupAt"],
      message: FOLLOWUP_PAST_VALIDATION_MESSAGE,
    });
  }
});

export const completeFollowupSchema = z.object({
  leadId: z.string().trim().min(1, "Lead ID is required."),
  completionDescription: z
    .string()
    .trim()
    .min(1, "Completion description is required."),
});
