import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
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

    if (!userId || !ownerAdminId || !officeLocationName) {
      return jsonError("Unauthorized access.", 401);
    }

    const access = await getSessionAccess(userId);
    if (!access || !hasPermission(access, "document_movement.retrieve")) {
      return jsonError("You do not have permission to retrieve outbound documents.", 403);
    }

    const userOfficeId = await resolveOfficeLocationId({ ownerAdminId, officeLocationName });
    if (!userOfficeId) {
      return jsonError("Current user office location not found.", 404);
    }

    console.log("[DEBUG Retrieve Route] session.user:", {
      userId,
      ownerAdminId,
      userName,
      officeLocationName,
      userOfficeId,
    });

    const body = await request.json().catch(() => ({}));
    const { bundleId, trackingNumbers, reason } = body;

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
      userOfficeName: officeLocationName,
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
