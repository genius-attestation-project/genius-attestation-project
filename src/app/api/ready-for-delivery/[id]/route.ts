import { auth } from "@/lib/auth";
import { getSessionAccess } from "@/features/admin/server/rbac.service";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { getReadyForDeliveryById } from "@/features/ready-for-delivery/server/ready-for-delivery.service";
import { jsonError, jsonOk } from "@/utils/response";
import { NextRequest } from "next/server";

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const denied = await requireApiPermission("ready_for_delivery.view");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    const userId = session?.user?.id;
    if (!ownerAdminId || !userId) return jsonError("Unauthorized.", 401);

    const userAccess = await getSessionAccess(userId);
    if (!userAccess) return jsonError("User session access not found.", 401);

    const { id } = await context.params;
    const registration = await getReadyForDeliveryById(ownerAdminId, userAccess, id);

    if (!registration) {
      return jsonError("Ready for delivery document not found or access is forbidden.", 404);
    }

    return jsonOk({ registration });
  } catch (error) {
    console.error("Failed to fetch ready for delivery document", error);
    return jsonError("Unable to fetch ready for delivery document.", 500);
  }
}
