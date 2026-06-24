import { getProcessStats, listProcessAssignments } from "@/features/process/server/process.service";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";
import { ProcessLocation } from "@/features/process/types/process.types";

export async function GET(request: Request) {
  const denied = await requireApiPermission("process.view");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;

    if (!ownerAdminId) {
      return jsonError("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const location = searchParams.get("location") as ProcessLocation || "INBOUND";
    const processType = searchParams.get("processType") || undefined;

    const stats = await getProcessStats(ownerAdminId, processType);
    const items = await listProcessAssignments(ownerAdminId, location, processType);

    return jsonOk({ items, stats });
  } catch (error) {
    console.error("Failed to fetch process assignments", error);
    return jsonError("Unable to fetch process assignments", 500);
  }
}
