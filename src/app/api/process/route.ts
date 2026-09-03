import { getProcessStats, listProcessAssignments } from "@/features/process/server/process.service";
import { hasOfficeAccess, hasPermission } from "@/features/admin/server/rbac.service";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const denied = await requireApiPermission("process.view");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;

    if (!ownerAdminId || !session?.user) {
      return jsonError("Unauthorized", 401);
    }

    let officeLocationName = session.user.officeLocationName;
    const isSuperAdmin = Boolean(session.user.isSuperAdmin);

    if (!isSuperAdmin && session.user.moduleOfficeVisibilities?.["process"]) {
      const processOfficeNames = session.user.moduleOfficeVisibilities["process"].officeNames;
      if (processOfficeNames && processOfficeNames.length > 0) {
        officeLocationName = processOfficeNames[0];
      }
    }

    const { searchParams } = new URL(request.url);
    const processType = searchParams.get("processType") || undefined;
    const tab = searchParams.get("tab") || undefined;
    const officeParam = searchParams.get("officeId") || searchParams.get("officeName") || searchParams.get("office");

    if (tab === "in_hand" && !hasPermission(session.user, "process.document_in_hand.view")) {
      return jsonError("Forbidden. You do not have permission to view Document In Hand in Process.", 403);
    }
    if (tab === "inbound" && !hasPermission(session.user, "process.inbound.view")) {
      return jsonError("Forbidden. You do not have permission to view Inbound in Process.", 403);
    }
    if (tab === "outbound" && !hasPermission(session.user, "process.outbound.view")) {
      return jsonError("Forbidden. You do not have permission to view Outbound in Process.", 403);
    }
    if (tab === "bundle" && !hasPermission(session.user, "process.bundle_movement.view")) {
      return jsonError("Forbidden. You do not have permission to view Bundle Movement in Process.", 403);
    }

    if (officeParam) {
      if (!hasOfficeAccess(session.user, officeParam, "process")) {
        return jsonError("You do not have access to the specified office location.", 403);
      }

      const foundOffice = await prisma.officeLocation.findFirst({
        where: {
          ownerAdminId,
          OR: [{ id: officeParam }, { officeName: officeParam }],
        },
        select: { officeName: true },
      });
      if (foundOffice) {
        officeLocationName = foundOffice.officeName;
      }
    }

    if (!officeLocationName) {
      return jsonError("Office location required", 400);
    }

    const stats = await getProcessStats(ownerAdminId, officeLocationName, processType);
    const items = await listProcessAssignments(ownerAdminId, officeLocationName, processType, tab, officeLocationName);

    return jsonOk({ items, stats });
  } catch (error) {
    console.error("Failed to fetch process assignments", error);
    return jsonError("Unable to fetch process assignments", 500);
  }
}
