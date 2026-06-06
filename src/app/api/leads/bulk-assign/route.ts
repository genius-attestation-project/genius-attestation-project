import { z } from "zod";

import { bulkAssignLeads } from "@/features/lead/server/lead.service";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";

const payloadSchema = z.object({
  leadIds: z.array(z.string().trim().min(1)).min(1, "Select at least one lead."),
  assignedUserId: z.string().trim().min(1, "Assigned user is required."),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const body = await request.json().catch(() => null);
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid bulk assignment payload.", 400);
    }

    const changedBy = session.user?.name ?? session.user?.email ?? undefined;
    const result = await bulkAssignLeads({
      ownerAdminId,
      leadIds: parsed.data.leadIds,
      assignedUserId: parsed.data.assignedUserId,
      changedBy,
    });

    return jsonOk({
      count: result.count,
      assignedUserName: result.assignedUserName,
      message:
        result.count > 0
          ? `${result.count} leads successfully reassigned to ${result.assignedUserName}`
          : `No lead assignments changed for ${result.assignedUserName}.`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Assigned user not found.") {
      return jsonError(error.message, 404);
    }

    console.error("Failed to bulk assign leads", error);
    return jsonError("Unable to bulk assign leads.", 500);
  }
}
