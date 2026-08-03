import { getProcessStats, listProcessAssignments } from "@/features/process/server/process.service";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";
import { ProcessLocation } from "@/features/process/types/process.types";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const denied = await requireApiPermission("process.view");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;

    if (!ownerAdminId) {
      return jsonError("Unauthorized", 401);
    }
    
    const officeLocationName = session?.user?.officeLocationName;
    if (!officeLocationName) {
      return jsonError("Office location required", 400);
    }

    const { searchParams } = new URL(request.url);
    const processType = searchParams.get("processType") || undefined;
    const tab = searchParams.get("tab") || undefined;

    const stats = await getProcessStats(ownerAdminId, officeLocationName, processType);
    const items = await listProcessAssignments(ownerAdminId, officeLocationName, processType, tab, officeLocationName);

    return jsonOk({ items, stats });
  } catch (error) {
    console.error("Failed to fetch process assignments", error);
    return jsonError("Unable to fetch process assignments", 500);
  }
}
