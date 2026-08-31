import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { listReadyForDelivery } from "@/features/ready-for-delivery/server/ready-for-delivery.service";
import { jsonError, jsonOk } from "@/utils/response";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const denied = await requireApiPermission("ready_for_delivery.view");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { searchParams } = new URL(request.url);
    const requestedOffice =
      searchParams.get("officeLocation") ||
      searchParams.get("registrationOffice") ||
      undefined;

    const officeFilter =
      requestedOffice && requestedOffice !== "all" && requestedOffice.trim() !== ""
        ? requestedOffice.trim()
        : null;

    const data = await listReadyForDelivery(ownerAdminId, officeFilter, {
      search: searchParams.get("search") ?? undefined,
      service: searchParams.get("service") ?? undefined,
      country: searchParams.get("country") ?? undefined,
      officeLocation: officeFilter ?? undefined,
      date: searchParams.get("date") ?? undefined,
    });

    return jsonOk(data);
  } catch (error) {
    console.error("Failed to fetch ready for delivery queue", error);
    return jsonError("Unable to fetch ready for delivery queue.", 500);
  }
}
