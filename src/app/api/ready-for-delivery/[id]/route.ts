import { auth } from "@/lib/auth";
import { resolveOfficeLocationName } from "@/lib/office-location";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { getReadyForDeliveryById } from "@/features/ready-for-delivery/server/ready-for-delivery.service";
import { jsonError, jsonOk } from "@/utils/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const denied = await requireApiPermission("ready_for_delivery.view");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const officeLocationName = await resolveOfficeLocationName({
      ownerAdminId,
      officeLocationId: session.user?.officeLocationId,
      officeLocationName: session.user?.officeLocationName,
    });

    if (!officeLocationName) {
      return jsonError("Office location is required for ready for delivery access.", 400);
    }

    const { id } = await context.params;
    const registration = await getReadyForDeliveryById(ownerAdminId, officeLocationName, id);

    if (!registration) {
      return jsonError("Ready for delivery document not found.", 404);
    }

    return jsonOk({ registration });
  } catch (error) {
    console.error("Failed to fetch ready for delivery document", error);
    return jsonError("Unable to fetch ready for delivery document.", 500);
  }
}
