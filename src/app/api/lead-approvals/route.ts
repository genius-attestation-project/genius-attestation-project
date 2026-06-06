import { z } from "zod";

import { createLeadApprovalRequest } from "@/features/lead/server/lead-approval.service";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";

const payloadSchema = z.object({
  leadId: z.string().trim().min(1, "Lead is required."),
  currentStatus: z.enum([
    "New",
    "Followup",
    "Assigned",
    "Pending_Approval",
    "Closed",
    "Qualified",
    "Potential_Qualified",
    "LOB",
  ]),
  requestedStatus: z.enum([
    "New",
    "Followup",
    "Assigned",
    "Pending_Approval",
    "Closed",
    "Qualified",
    "Potential_Qualified",
    "LOB",
  ]),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    const requestedBy = session?.user?.id;
    if (!ownerAdminId || !requestedBy) return jsonError("Authentication required.", 401);

    const body = await request.json().catch(() => null);
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid approval payload.", 400);
    }

    const result = await createLeadApprovalRequest({
      ownerAdminId,
      leadId: parsed.data.leadId,
      currentStatus: parsed.data.currentStatus,
      requestedStatus: parsed.data.requestedStatus,
      requestedBy,
    });

    return jsonOk({
      requestId: result.requestId,
      message: result.notificationMessage,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Assign a supervisor to this user before requesting approval." ||
        error.message === "Supervisor not found." ||
        error.message === "Requesting user not found.")
    ) {
      return jsonError(error.message, 400);
    }

    console.error("Failed to create lead approval request", error);
    return jsonError("Unable to create lead approval request.", 500);
  }
}
