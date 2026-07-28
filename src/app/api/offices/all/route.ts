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

    const [officeLocations, assignedOffices] = await Promise.all([
      prisma.officeLocation.findMany({
        where: { ownerAdminId },
        select: { id: true, officeName: true, isProcessOffice: true },
        orderBy: { officeName: "asc" },
      }),
      db.assignedOffice ? db.assignedOffice.findMany({
        where: { ownerAdminId, status: true },
        select: { id: true, username: true, email: true },
        orderBy: { username: "asc" },
      }) : Promise.resolve([]),
    ]);

    const officeMap = new Map<string, { id: string; officeName: string; type: string }>();

    for (const loc of officeLocations) {
      officeMap.set(loc.officeName.toLowerCase(), {
        id: loc.id,
        officeName: loc.officeName,
        type: loc.isProcessOffice ? "Process Office" : "Office Location",
      });
    }

    for (const ao of (assignedOffices as any[])) {
      if (!officeMap.has(ao.username.toLowerCase())) {
        officeMap.set(ao.username.toLowerCase(), {
          id: ao.id,
          officeName: ao.username,
          type: "Assigned Office",
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
