import { sendToOffice } from "@/features/document-movement/server/document-movement.service";
import { auth } from "@/lib/auth";
import { resolveOfficeLocationId } from "@/lib/office-location";
import { jsonError, jsonOk } from "@/utils/response";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    const performedBy = session?.user?.name || session?.user?.email || "System";
    const officeLocationName = session?.user?.officeLocationName;
    const userId = session?.user?.id;

    if (!ownerAdminId) {
      return jsonError("Unauthorized", 401);
    }

    const fromOfficeId = await resolveOfficeLocationId({
      ownerAdminId,
      officeLocationId: session?.user?.officeLocationId,
      officeLocationName,
      userId,
    });
    if (!fromOfficeId) return jsonError("Office not found", 404);

    const body = await request.json();
    const { trackingNumber, toOfficeId, fromModule, toModule, remarks } = body;

    if (!trackingNumber || !toOfficeId || !fromModule || !toModule) {
      return jsonError("Missing required fields", 400);
    }

    await sendToOffice(
      ownerAdminId,
      trackingNumber,
      fromOfficeId,
      toOfficeId,
      fromModule,
      toModule,
      performedBy,
      remarks
    );

    return jsonOk({ success: true });
  } catch (error) {
    console.error("Failed to send document", error);
    return jsonError(error instanceof Error ? error.message : "Internal error", 500);
  }
}
