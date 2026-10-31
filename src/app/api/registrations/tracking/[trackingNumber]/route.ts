import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";
import { getRegistrationByTrackingNumber } from "@/features/registration/server/registration.service";
import { getSessionAccess, hasOfficeAccess, hasPermission, canUserViewDocumentDetails } from "@/features/admin/server/rbac.service";
import { NextRequest } from "next/server";

export async function GET(_: NextRequest, context: { params: Promise<{ trackingNumber: string }> }) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId || !session?.user) {
      return jsonError("Unauthorized", 401);
    }

    const access = await getSessionAccess(session.user.id);
    const canSearch =
      Boolean(access?.isSuperAdmin) ||
      hasPermission(access, "search_report.search") ||
      hasPermission(access, "search_report.view") ||
      canUserViewDocumentDetails(access);

    if (!canSearch) {
      return jsonError("You do not have permission to search registrations.", 403);
    }

    const { trackingNumber } = await context.params;
    const decodedTrackingNumber = decodeURIComponent(trackingNumber).trim();
    const registration = await getRegistrationByTrackingNumber(ownerAdminId, decodedTrackingNumber);

    if (!registration) return jsonError("Registration not found.", 404);

    // Office Visibility check for non-superadmins
    if (access && !access.isSuperAdmin) {
      const regOffice =
        registration.regionOfRegistration ||
        registration.officeLocationName ||
        registration.officeLocationId;

      if (regOffice) {
        const isAllowed =
          hasOfficeAccess(access, regOffice, "search_report") ||
          hasOfficeAccess(access, regOffice, "revenue_registration") ||
          hasOfficeAccess(access, regOffice);

        if (!isAllowed) {
          return jsonError("You are not authorized to view registrations for this office.", 403);
        }
      }
    }

    return jsonOk({ registration });
  } catch (error) {
    console.error("Failed to fetch registration by tracking number", error);
    return jsonError("Unable to fetch registration.", 500);
  }
}
