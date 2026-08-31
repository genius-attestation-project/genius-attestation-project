import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { getBmLocationTrackingData } from "@/features/bm-report/server/bm-tracking.service";
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

    const sections = await getBmLocationTrackingData({
      ownerAdminId,
      tab: "in_hand",
    });

    const totalDocuments = sections.reduce((sum, sec) => sum + sec.documents.length, 0);

    return jsonOk({
      stats: {
        totalSections: sections.length,
        totalDocuments,
      },
    });
  } catch (error) {
    console.error("Failed to load BM realtime stats", error);
    return jsonError("Unable to load movement tracking stats.", 500);
  }
}
