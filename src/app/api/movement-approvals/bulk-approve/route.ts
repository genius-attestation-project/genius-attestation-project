import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { bulkApproveMovementApprovals } from "@/features/document-movement/server/movement-approval.service";
import { jsonError, jsonOk } from "@/utils/response";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId || !session?.user?.id) {
      return jsonError("Unauthorized.", 401);
    }

    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body.ids) ? body.ids : Array.isArray(body.documentIds) ? body.documentIds : [];

    if (ids.length === 0) {
      return jsonError("No movement approval IDs provided for bulk approval.", 400);
    }

    const remarks = typeof body.remarks === "string" ? body.remarks : undefined;

    const result = await bulkApproveMovementApprovals({
      ids,
      ownerAdminId,
      approvedByUserId: session.user.id,
      approvedByName: session.user.name ?? session.user.email ?? "Admin User",
      remarks,
    });

    return jsonOk({ success: true, count: result.count, items: result.items });
  } catch (error: any) {
    console.error("Failed to process bulk movement approval:", error);
    return jsonError(error.message || "Failed to process bulk movement approval.", 500);
  }
}
