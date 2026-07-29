import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { getRealtimeMovementStats } from "@/features/bm-report/server/bm-tracking.service";
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

    const isSuperAdmin = session?.user?.isSuperAdmin ?? false;
    const userOfficeLocationId = session?.user?.officeLocationId ?? undefined;

    const stats = await getRealtimeMovementStats(
      ownerAdminId,
      userOfficeLocationId,
      isSuperAdmin
    );

    return jsonOk({ stats });
  } catch (error) {
    console.error("Failed to load BM realtime stats", error);
    return jsonError("Unable to load movement tracking stats.", 500);
  }
}
