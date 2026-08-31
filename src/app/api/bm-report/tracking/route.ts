import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import {
  getBmLocationTrackingData,
  getRegistrationOffices,
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

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "offices") {
      const offices = await getRegistrationOffices(ownerAdminId);
      return jsonOk({ offices });
    }

    const registrationOffice = searchParams.get("registrationOffice") ?? undefined;
    const tab = (searchParams.get("tab") as BmTrackingTab) || "in_hand";
    const search = searchParams.get("search") ?? undefined;

    const sections = await getBmLocationTrackingData({
      ownerAdminId,
      registrationOffice,
      tab,
      search,
    });

    return jsonOk({ sections });
  } catch (error) {
    console.error("Failed to list BM location tracking records", error);
    return jsonError("Unable to load document movement tracking records.", 500);
  }
}
