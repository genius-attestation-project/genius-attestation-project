import {
  moveProcessAssignment,
  transferProcessDocumentsToHome,
  transferProcessDocumentsToAssignedOffice,
  processBulkMove,
} from "@/features/process/server/process.service";
import { auth } from "@/lib/auth";
import { resolveOfficeLocationName } from "@/lib/office-location";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";
import { moveProcessSchema } from "@/features/process/types/process.types";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const denied = await requireApiPermission("process.move");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    const userId = session?.user?.id;
    const userName = session?.user?.name || undefined;

    if (!ownerAdminId || !userId) {
      return jsonError("Unauthorized", 401);
    }

    const body = await request.json();
    const parsed = moveProcessSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Invalid input", 400);
    }

    const { assignmentId, trackingNumbers, action, targetOfficeId, remarks } = parsed.data;

    const officeLocationName = await resolveOfficeLocationName({
      ownerAdminId,
      officeLocationId: session?.user?.officeLocationId,
      officeLocationName: session?.user?.officeLocationName,
      userId: session?.user?.id,
    });

    const targetList = trackingNumbers && trackingNumbers.length > 0
      ? trackingNumbers
      : assignmentId
      ? [assignmentId]
      : [];

    if (targetList.length === 0) {
      return jsonError("No target documents or assignment specified", 400);
    }

    if (action === "TRANSFER_TO_HOME" || action === "TRANSFER_TO_ASSIGNED_OFFICE") {
      const { hasPermission } = await import("@/features/admin/server/rbac.service");
      const canTransfer =
        hasPermission(session.user, "process.document_in_hand.transfer") ||
        hasPermission(session.user, "process.transfer") ||
        hasPermission(session.user, "process.move") ||
        Boolean(session.user.isSuperAdmin || session.user.role === "Super Admin");

      if (!canTransfer) {
        return jsonError("Forbidden. You do not have permission to transfer process documents.", 403);
      }
    }

    if (action === "RECEIVE") {
      const { hasPermission } = await import("@/features/admin/server/rbac.service");
      const canReceive =
        hasPermission(session.user, "process.inbound.receive") ||
        hasPermission(session.user, "process.receive") ||
        hasPermission(session.user, "process.move") ||
        Boolean(session.user.isSuperAdmin || session.user.role === "Super Admin");

      if (!canReceive) {
        return jsonError("Forbidden. You do not have permission to receive process documents.", 403);
      }
    }

    if (action === "TRANSFER_TO_HOME") {
      if (!targetOfficeId) return jsonError("Destination office required", 400);
      const result = await transferProcessDocumentsToHome({
        trackingNumbers: targetList,
        toOfficeId: targetOfficeId,
        userId,
        userName,
        ownerAdminId,
        remarks,
      });
      return jsonOk({ success: true, data: result });
    }

    if (action === "TRANSFER_TO_ASSIGNED_OFFICE") {
      if (!targetOfficeId) return jsonError("Target Assigned Office required", 400);
      const { resolveOfficeLocationId } = await import("@/lib/office-location");
      const userOfficeLocationId = await resolveOfficeLocationId({
        ownerAdminId,
        officeLocationName: officeLocationName || undefined,
        officeLocationId: session?.user?.officeLocationId,
        userId,
      });
      const result = await transferProcessDocumentsToAssignedOffice({
        trackingNumbers: targetList,
        targetAssignedOfficeId: targetOfficeId,
        userId,
        userName,
        ownerAdminId,
        remarks,
        fromOfficeId: userOfficeLocationId || undefined,
      });
      return jsonOk({ success: true, data: result });
    }

    const result = await processBulkMove({
      trackingNumbers: targetList,
      action: action as any,
      userId,
      ownerAdminId,
      remarks,
      officeLocationName: officeLocationName || undefined,
    });

    return jsonOk({ success: true, data: result });
  } catch (error) {
    console.error("Failed to move process", error);
    return jsonError(error instanceof Error ? error.message : "Unable to move process", 500);
  }
}
