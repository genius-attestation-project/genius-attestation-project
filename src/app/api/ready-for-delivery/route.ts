import { auth } from "@/lib/auth";
import { getSessionAccess, hasOfficeAccess } from "@/features/admin/server/rbac.service";
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
    const userId = session?.user?.id;
    if (!ownerAdminId || !userId) return jsonError("Unauthorized.", 401);

    const userAccess = await getSessionAccess(userId);
    if (!userAccess) return jsonError("User session access not found.", 401);

    const { searchParams } = new URL(request.url);
    const requestedOffice =
      searchParams.get("officeLocation") ||
      searchParams.get("registrationOffice") ||
      undefined;

    const isSuperAdmin = userAccess.isSuperAdmin === true || userAccess.allowedOfficeNames === null;

    let officeFilter: string | null = null;

    if (requestedOffice && requestedOffice.trim() !== "") {
      const trimmed = requestedOffice.trim();
      if (trimmed === "all") {
        if (!isSuperAdmin) {
          return jsonError("Access to 'All Delivery Locations' is forbidden for non-Super Admin users.", 403);
        }
        officeFilter = null;
      } else {
        if (!hasOfficeAccess(userAccess, trimmed)) {
          return jsonError("Access to the requested office location is forbidden.", 403);
        }
        officeFilter = trimmed;
      }
    } else {
      if (!isSuperAdmin) {
        // Default to user's assigned office (first authorized office)
        officeFilter = userAccess.allowedOfficeNames?.[0] ?? null;
      } else {
        officeFilter = null;
      }
    }

    const data = await listReadyForDelivery(
      ownerAdminId,
      officeFilter,
      {
        search: searchParams.get("search") ?? undefined,
        service: searchParams.get("service") ?? undefined,
        country: searchParams.get("country") ?? undefined,
        officeLocation: officeFilter ?? undefined,
        date: searchParams.get("date") ?? undefined,
      },
      userAccess
    );

    return jsonOk(data);
  } catch (error) {
    console.error("Failed to fetch ready for delivery queue", error);
    return jsonError("Unable to fetch ready for delivery queue.", 500);
  }
}
