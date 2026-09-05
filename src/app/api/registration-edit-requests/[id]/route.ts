import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { getEditRequestById } from "@/features/registration/server/registration-edit-request.service";

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId || !session?.user) return jsonError("Unauthorized", 401);

    const canView =
      hasPermission(session.user, "edit_request.view") ||
      hasPermission(session.user, "pending_approval.view");

    if (!canView) {
      return jsonError("You do not have permission to view edit requests.", 403);
    }

    const { id } = await context.params;
    const item = await getEditRequestById(ownerAdminId, id);

    if (!item) {
      return jsonError("Edit request not found.", 404);
    }

    return jsonOk({ item });
  } catch (error) {
    console.error("Failed to fetch registration edit request", error);
    return jsonError("Unable to fetch edit request.", 500);
  }
}
