import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  listPendingMovementApprovals,
  createMovementApprovalRequest,
} from "@/features/document-movement/server/movement-approval.service";
import { resolveOfficeLocationId, resolveOfficeLocationName } from "@/lib/office-location";
import { jsonError, jsonOk } from "@/utils/response";
import { hasPermission } from "@/features/admin/server/rbac.service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId || !session?.user) return jsonError("No owner admin ID found.", 401);

    if (!session.user.isSuperAdmin && !hasPermission(session.user, "movement_approval.view")) {
      return jsonError("Forbidden. You do not have permission to view movement approvals.", 403);
    }

    const url = new URL(request.url);
    const queryOfficeId = url.searchParams.get("officeId") || url.searchParams.get("officeLocationId");
    const queryOfficeName = url.searchParams.get("office") || url.searchParams.get("officeName");

    const userOfficeName = await resolveOfficeLocationName({
      ownerAdminId,
      userId: session?.user?.id,
      officeLocationId: queryOfficeId || (session?.user as any)?.officeLocationId,
      officeLocationName: queryOfficeName || (session?.user as any)?.officeLocationName,
    });

    const userOfficeId = await resolveOfficeLocationId({
      ownerAdminId,
      userId: session?.user?.id,
      officeLocationId: queryOfficeId || (session?.user as any)?.officeLocationId,
      officeLocationName: queryOfficeName || (session?.user as any)?.officeLocationName,
    });

    let allowedOfficeIds = session.user.allowedOfficeIds;
    let allowedOfficeNames = session.user.allowedOfficeNames;

    if (!session.user.isSuperAdmin && session.user.moduleOfficeVisibilities?.["pending_approval"]) {
      const modConfig = session.user.moduleOfficeVisibilities["pending_approval"];
      allowedOfficeIds = modConfig.officeIds;
      allowedOfficeNames = modConfig.officeNames;
    }

    const items = await listPendingMovementApprovals({
      ownerAdminId,
      officeId: (queryOfficeId ? userOfficeId : undefined) ?? undefined,
      officeName: (queryOfficeName ? userOfficeName : undefined) ?? undefined,
      isSuperAdmin: session.user.isSuperAdmin,
      allowedOfficeIds: allowedOfficeIds ?? undefined,
      allowedOfficeNames: allowedOfficeNames ?? undefined,
    });
    return jsonOk({ items });
  } catch (error: any) {
    console.error("Failed to list pending movement approvals:", error);
    return jsonError(error.message || "Failed to list movement approvals.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId || !session?.user?.id) {
      return jsonError("Unauthorized.", 401);
    }

    const canCreate =
      session.user.isSuperAdmin ||
      hasPermission(session.user, "revenue_registration.movement_request") ||
      hasPermission(session.user, "movement_approval.create");

    if (!canCreate) {
      return jsonError("Forbidden. You do not have permission to request movement approval.", 403);
    }

    const body = await request.json().catch(() => ({}));
    const registrationId = typeof body.registrationId === "string" ? body.registrationId.trim() : "";
    const remarks = typeof body.remarks === "string" ? body.remarks.trim() : "";

    if (!registrationId) {
      return jsonError("Registration ID is required.", 400);
    }

    if (!remarks) {
      return jsonError("Remarks are mandatory when requesting movement approval.", 400);
    }

    const item = await createMovementApprovalRequest({
      ownerAdminId,
      registrationId,
      performedBy: session.user.name || session.user.email || "System User",
      requestedByUserId: session.user.id,
      remarks,
    });

    if (!item) {
      return jsonError("Unable to create movement approval request. Document not found or advance payment exists.", 400);
    }

    return jsonOk({ success: true, item });
  } catch (error: any) {
    console.error("Failed to create movement approval request:", error);
    return jsonError(error.message || "Failed to create movement approval request.", 500);
  }
}
