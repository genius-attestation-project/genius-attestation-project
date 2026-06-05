import { auth } from "@/lib/auth";
import { resolveOfficeLocationName } from "@/lib/office-location";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { listReadyForDelivery } from "@/features/ready-for-delivery/server/ready-for-delivery.service";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const data = await listReadyForDelivery(ownerAdminId, officeLocationName, {
      search: searchParams.get("search") ?? undefined,
      service: searchParams.get("service") ?? undefined,
      country: searchParams.get("country") ?? undefined,
      officeLocation: searchParams.get("officeLocation") ?? undefined,
      date: searchParams.get("date") ?? undefined,
    });

    return jsonOk(data);
  } catch (error) {
    console.error("Failed to fetch ready for delivery queue", error);
    return jsonError("Unable to fetch ready for delivery queue.", 500);
  }
}
