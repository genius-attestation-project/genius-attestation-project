import { z } from "zod";

import { rejectLeadApproval } from "@/features/lead/server/lead-approval.service";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";

const payloadSchema = z.object({
  reason: z.string().trim().min(1, "Rejection reason is required."),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const denied = await requireApiPermission("pending_approval.edit");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    const supervisorId = session?.user?.id;
    if (!ownerAdminId || !supervisorId) return jsonError("Authentication required.", 401);

    const body = await request.json().catch(() => null);
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid rejection payload.", 400);
    }

    const { id } = await context.params;
    const result = await rejectLeadApproval({
      ownerAdminId,
      approvalId: id,
      supervisorId,
      reason: parsed.data.reason,
    });

    if (!result) {
      return jsonError("Approval request not found.", 404);
    }

    return jsonOk({ message: result.notificationMessage });
  } catch (error) {
    console.error("Failed to reject lead request", error);
    return jsonError("Unable to reject lead request.", 500);
  }
}
