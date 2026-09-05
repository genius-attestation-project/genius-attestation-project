import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { rejectEditRequest } from "@/features/registration/server/registration-edit-request.service";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId || !session?.user) return jsonError("Unauthorized", 401);

    const canReject =
      hasPermission(session.user, "edit_request.reject") ||
      hasPermission(session.user, "pending_approval.edit");

    if (!canReject) {
      return jsonError("You do not have permission to reject edit requests.", 403);
    }

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const rejectionReason = (body?.rejectionReason ?? "").trim();

    if (!rejectionReason) {
      return jsonError("Rejection reason is required.", 400);
    }

    const rejecterName = session.user.name ?? session.user.email ?? "Approver";

    const editRequest = await rejectEditRequest({
      ownerAdminId,
      id,
      rejectionReason,
      rejectedById: session.user.id,
      rejectedByName: rejecterName,
    });

    return jsonOk({
      success: true,
      message: "Edit request rejected.",
      editRequest,
    });
  } catch (error: any) {
    if (error?.statusCode) {
      return jsonError(error.message, error.statusCode);
    }

    const message = error instanceof Error ? error.message : "Failed to reject edit request.";
    console.error("Failed to reject registration edit request", error);
    return jsonError(message, 500);
  }
}
