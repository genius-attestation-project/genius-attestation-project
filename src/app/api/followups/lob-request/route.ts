import { requestMoveFollowupToLob } from "@/features/lead/server/lead.service";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    const userId = session?.user?.id;
    if (!ownerAdminId || !userId) return jsonError("Authentication required.", 401);

    const body = (await request.json().catch(() => null)) as { leadId?: unknown } | null;
    const leadId = typeof body?.leadId === "string" ? body.leadId.trim() : "";
    if (!leadId) {
      return jsonError("Lead ID is required.", 400);
    }

    const result = await requestMoveFollowupToLob({ ownerAdminId, userId, leadId });
    if (!result) {
      return jsonError("Follow-up lead not found.", 404);
    }

    return jsonOk({
      requestId: result.id,
      message: "LOB request sent for supervisor approval.",
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

    console.error("Failed to request LOB approval", error);
    return jsonError(error instanceof Error ? error.message : "Unable to request LOB approval.", 500);
  }
}
