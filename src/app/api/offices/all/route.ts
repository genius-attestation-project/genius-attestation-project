import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.ownerAdminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownerAdminId = currentUser.ownerAdminId;
    const db = prisma as any;

    const { searchParams } = new URL(req.url);
    const processOnly = searchParams.get("processOnly") === "true" || searchParams.get("isProcessOffice") === "true";

    const [officeLocations, assignedOffices] = await Promise.all([
      prisma.officeLocation.findMany({
        where: {
          ownerAdminId,
          ...(processOnly ? { isProcessOffice: true } : {}),
        },
        select: { id: true, officeName: true, isProcessOffice: true },
        orderBy: { officeName: "asc" },
      }),
      db.assignedOffice ? db.assignedOffice.findMany({
        where: { ownerAdminId, status: true },
        select: { id: true, username: true, email: true },
        orderBy: { username: "asc" },
      }) : Promise.resolve([]),
    ]);

    const assignedOfficeIds = new Set((assignedOffices as any[]).map((ao: any) => ao.id));
    const assignedOfficeNames = new Set((assignedOffices as any[]).map((ao: any) => ao.username.toLowerCase()));

    const officeMap = new Map<
      string,
      {
        id: string;
        officeName: string;
        type: string;
        category: "ASSIGNED_OFFICE" | "GLOBAL_OFFICE";
        isAssignedOffice: boolean;
      }
    >();

    for (const loc of officeLocations) {
      const isAssigned = assignedOfficeIds.has(loc.id) || assignedOfficeNames.has(loc.officeName.toLowerCase());
      officeMap.set(loc.officeName.toLowerCase(), {
        id: loc.id,
        officeName: loc.officeName,
        type: isAssigned ? "Assigned Office" : loc.isProcessOffice ? "Process Office" : "Office Location",
        category: isAssigned ? "ASSIGNED_OFFICE" : "GLOBAL_OFFICE",
        isAssignedOffice: isAssigned,
      });
    }

    for (const ao of (assignedOffices as any[])) {
      const key = ao.username.toLowerCase();
      if (!officeMap.has(key)) {
        officeMap.set(key, {
          id: ao.id,
          officeName: ao.username,
          type: "Assigned Office",
          category: "ASSIGNED_OFFICE",
          isAssignedOffice: true,
        });
      }
    }

    const offices = Array.from(officeMap.values()).sort((a, b) =>
      a.officeName.localeCompare(b.officeName)
    );

    return NextResponse.json({ offices, data: offices });
  } catch (error: any) {
    console.error("Failed to fetch all offices:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
