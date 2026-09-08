import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import {
  getBmLocationTrackingData,
  getRegistrationOffices,
  getBmReportOfficeScope,
  type BmTrackingTab,
} from "@/features/bm-report/server/bm-tracking.service";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET(request: NextRequest) {
  const denied = await requireApiPermission("bm_report.view");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) {
      return jsonError("No owner admin ID found.", 401);
    }

    const { isSuperAdmin, allowedOfficeNames } = getBmReportOfficeScope(session?.user);

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "offices") {
      const offices = await getRegistrationOffices(ownerAdminId, allowedOfficeNames, isSuperAdmin);
      return jsonOk({ offices });
    }

    const registrationOffice = searchParams.get("registrationOffice") ?? undefined;
    const tab = (searchParams.get("tab") as BmTrackingTab) || "in_hand";
    const search = searchParams.get("search") ?? undefined;

    // Backend security enforcement against unauthorized office queries
    if (
      !isSuperAdmin &&
      allowedOfficeNames !== null &&
      registrationOffice &&
      registrationOffice !== "all" &&
      registrationOffice.trim() !== ""
    ) {
      const isAllowed = allowedOfficeNames.some(
        (name) => name.trim().toLowerCase() === registrationOffice.trim().toLowerCase()
      );
      if (!isAllowed) {
        return jsonError("Access to the requested registration office is forbidden.", 403);
      }
    }

    const sections = await getBmLocationTrackingData({
      ownerAdminId,
      registrationOffice,
      tab,
      search,
      allowedOfficeNames,
      isSuperAdmin,
    });

    return jsonOk({ sections });
  } catch (error) {
    console.error("Failed to list BM location tracking records", error);
    return jsonError("Unable to load document movement tracking records.", 500);
  }
}
