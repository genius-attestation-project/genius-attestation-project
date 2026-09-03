import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { approveMovementApproval } from "@/features/document-movement/server/movement-approval.service";
import { jsonError, jsonOk } from "@/utils/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId || !session?.user?.id) {
      return jsonError("Unauthorized.", 401);
    }

    const canApprove =
      session.user.isSuperAdmin ||
      hasPermission(session.user, "movement_approval.approve") ||
      hasPermission(session.user, "pending_approval.edit");

    if (!canApprove) {
      return jsonError("Forbidden. You do not have permission to approve movement requests.", 403);
    }

    const { id } = await params;
    if (!id) {
      return jsonError("Movement approval ID is required.", 400);
    }

    const body = await request.json().catch(() => ({}));
    const remarks = typeof body.remarks === "string" ? body.remarks : undefined;

    const item = await approveMovementApproval({
      id,
      ownerAdminId,
      approvedByUserId: session.user.id,
      approvedByName: session.user.name ?? session.user.email ?? "Admin User",
      remarks,
    });

    return jsonOk({ success: true, item });
  } catch (error: any) {
    console.error("Failed to approve movement request:", error);
    return jsonError(error.message || "Failed to approve movement request.", 500);
  }
}
