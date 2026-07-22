import { markReadyForDelivery } from "@/features/bm-report/server/bm-report.service";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";
import { resolveOfficeLocationName } from "@/lib/office-location";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const denied = await requireApiPermission("bmReport.accept"); // same perm for now
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    const userId = session?.user?.id;

    if (!ownerAdminId || !userId) {
      return jsonError("Unauthorized", 401);
    }

    const { id } = await context.params;

    const officeLocationName = await resolveOfficeLocationName({
      ownerAdminId,
      officeLocationId: session?.user?.officeLocationId,
      officeLocationName: session?.user?.officeLocationName,
    });

    if (!officeLocationName) {
      return jsonError("Office location required", 400);
    }

    const updated = await markReadyForDelivery({
      id,
      ownerAdminId,
      officeLocationName,
      performedByUserId: userId,
      performedByName: session?.user?.name || undefined,
    });

    if (!updated) {
      return jsonError("Unable to mark ready for delivery.", 400);
    }

    return jsonOk({ success: true });
  } catch (error) {
    console.error("Failed to mark ready for delivery:", error);
    return jsonError(error instanceof Error ? error.message : "Internal Server Error", 500);
  }
}
