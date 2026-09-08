import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSessionAccess, hasPermission } from "@/features/admin/server/rbac.service";
import { resolveOfficeLocationId } from "@/lib/office-location";
import { retrieveOutboundDocuments } from "@/features/document-movement/server/document-retrieve.service";
import { jsonError, jsonOk } from "@/utils/response";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const ownerAdminId = session?.user?.ownerAdminId;
    const userName = session?.user?.name || session?.user?.email || "System User";
    const officeLocationName = session?.user?.officeLocationName;
    const officeLocationId = session?.user?.officeLocationId || (session?.user as any)?.officeId || (session?.user as any)?.assignedOfficeId;
    const isAssignedOffice = (session?.user as any)?.accountType === "ASSIGNED_OFFICE";

    if (!userId || !ownerAdminId) {
      return jsonError("Unauthorized access.", 401);
    }

    const access = await getSessionAccess(userId);
    const canRetrieve =
      isAssignedOffice ||
      hasPermission(access, "document_movement.retrieve") ||
      hasPermission(access, "home.outbound.retrieve") ||
      hasPermission(access, "home.retrieve") ||
      hasPermission(access, "process.outbound.retrieve") ||
      hasPermission(access, "process.retrieve") ||
      hasPermission(access, "assigned_office.retrieve") ||
      hasPermission(access, "assigned_office.view") ||
      Boolean(access?.isSuperAdmin || (access as any)?.role === "Super Admin");

    if (!canRetrieve) {
      return jsonError("You do not have permission to retrieve outbound documents.", 403);
    }

    const body = await request.json().catch(() => ({}));
    const { bundleId, trackingNumbers: rawTrackingNumbers, documentIds, reason } = body;
    const trackingNumbers = Array.isArray(rawTrackingNumbers) && rawTrackingNumbers.length > 0
      ? rawTrackingNumbers
      : (Array.isArray(documentIds) ? documentIds : undefined);

    let userOfficeId = await resolveOfficeLocationId({
      ownerAdminId,
      officeLocationId,
      officeLocationName,
      userId,
    });

    if (!userOfficeId && bundleId) {
      const b = await (prisma as any).bundle.findUnique({
        where: { id: bundleId },
        select: { fromOfficeId: true, ownerAdminId: true },
      });
      if (b && b.ownerAdminId === ownerAdminId) {
        userOfficeId = b.fromOfficeId;
      }
    }

    if (!userOfficeId) {
      return jsonError("Current user office location not found.", 404);
    }

    console.log("[DEBUG Retrieve Route] session.user:", {
      userId,
      ownerAdminId,
      userName,
      officeLocationName,
      officeLocationId,
      userOfficeId,
    });

    console.log("[DEBUG Retrieve Route] Request body:", {
      bundleId,
      trackingNumbers,
      reason,
    });

    if (!bundleId && (!trackingNumbers || !Array.isArray(trackingNumbers) || trackingNumbers.length === 0)) {
      return jsonError("Bundle ID or tracking numbers are required for retrieval.", 400);
    }

    const result = await retrieveOutboundDocuments({
      ownerAdminId,
      userId,
      userName,
      userOfficeId,
      userOfficeName: officeLocationName || "Office",
      bundleId,
      trackingNumbers,
      reason,
    });

    console.log("[DEBUG Retrieve Route] Result:", result);

    return jsonOk(result);
  } catch (error: any) {
    console.error("[POST /api/document-movement/retrieve] Error:", error);
    return jsonError(error?.message || "Failed to retrieve outbound documents.", 500);
  }
}
