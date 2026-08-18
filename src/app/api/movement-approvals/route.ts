import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { listPendingMovementApprovals } from "@/features/document-movement/server/movement-approval.service";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const items = await listPendingMovementApprovals(ownerAdminId);
    return jsonOk({ items });
  } catch (error: any) {
    console.error("Failed to list pending movement approvals:", error);
    return jsonError(error.message || "Failed to list movement approvals.", 500);
  }
}
