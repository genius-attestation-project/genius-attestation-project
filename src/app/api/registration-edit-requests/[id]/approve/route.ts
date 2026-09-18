import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";
import { hasOfficeAccess, hasPermission } from "@/features/admin/server/rbac.service";
import { approveEditRequest, getEditRequestById } from "@/features/registration/server/registration-edit-request.service";

export async function POST(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId || !session?.user) return jsonError("Unauthorized", 401);

    const canApprove =
      session.user.isSuperAdmin ||
      hasPermission(session.user, "edit_request.approve");

    if (!canApprove) {
      return jsonError("You do not have permission to approve edit requests.", 403);
    }

    const { id } = await context.params;

    const editRequest = await getEditRequestById(ownerAdminId, id);
    if (!editRequest) {
      return jsonError("Edit request not found.", 404);
    }

    if (!session.user.isSuperAdmin) {
      const office = editRequest.currentOffice || editRequest.registrationOffice;
      if (!hasOfficeAccess(session.user, office, "pending_approval")) {
        return jsonError("You do not have office visibility access to approve this edit request.", 403);
      }
    }

    const approverName = session.user.name ?? session.user.email ?? "Approver";

    const result = await approveEditRequest({
      ownerAdminId,
      id,
      approvedById: session.user.id,
      approvedByName: approverName,
    });

    return jsonOk({
      success: true,
      message: "Edit request approved successfully. Changes applied to document.",
      ...result,
    });
  } catch (error: any) {
    if (error?.statusCode) {
      return jsonError(error.message, error.statusCode);
    }

    const message = error instanceof Error ? error.message : "Failed to approve edit request.";
    console.error("Failed to approve registration edit request", error);
    return jsonError(message, 500);
  }
}
