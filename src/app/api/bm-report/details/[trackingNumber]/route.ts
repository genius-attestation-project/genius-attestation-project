import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { getDocumentMovementDetails } from "@/features/bm-report/server/bm-tracking.service";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ trackingNumber: string }> }
) {
  const denied = await requireApiPermission("bm_report.view");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) {
      return jsonError("No owner admin ID found.", 401);
    }

    const { trackingNumber } = await context.params;
    if (!trackingNumber) {
      return jsonError("Tracking number is required.", 400);
    }

    const details = await getDocumentMovementDetails(ownerAdminId, trackingNumber);

    return jsonOk({ details });
  } catch (error: any) {
    console.error("Failed to load document movement details", error);
    return jsonError(error.message || "Unable to load document details.", 500);
  }
}
