import { getProcessStats, listProcessAssignments } from "@/features/process/server/process.service";
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

    if (!ownerAdminId) {
      return jsonError("Unauthorized", 401);
    }

    let officeLocationName = session?.user?.officeLocationName;

    const { searchParams } = new URL(request.url);
    const processType = searchParams.get("processType") || undefined;
    const tab = searchParams.get("tab") || undefined;
    const officeParam = searchParams.get("officeId") || searchParams.get("officeName") || searchParams.get("office");

    if (officeParam) {
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
