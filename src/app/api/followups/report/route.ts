import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasOfficeAccess } from "@/features/admin/server/rbac.service";
import { buildLeadOfficeCondition } from "@/features/lead/server/lead.service";
import { jsonError, jsonOk } from "@/utils/response";
import { NextRequest } from "next/server";

function leadCreatorWhere(ownerAdminId: string, userId: string): Prisma.LeadWhereInput {
  return {
    ownerAdminId,
    OR: [
      { createdById: userId },
      { assignedUserId: userId },
      { followupHistory: { some: { userId } } },
    ],
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    const userId = session?.user?.id;

    if (!ownerAdminId || !userId) {
      return jsonError("Authentication required.", 401);
    }

    const payload = await request.json();
    const {
      fromDate,
      toDate,
      leadOwner,
      assignedUser,
      officeLocationId,
      leadStatus,
      country,
      state,
    } = payload;

    if (officeLocationId && !hasOfficeAccess(session?.user, officeLocationId, "lead_management")) {
      return jsonError("Access denied for the requested office.", 403);
    }

    const officeCondition = buildLeadOfficeCondition(session?.user, officeLocationId);

    const andConditions: Prisma.LeadWhereInput[] = [
      leadCreatorWhere(ownerAdminId, userId),
      { nextFollowupAt: { not: null } },
    ];

    if (Object.keys(officeCondition).length > 0) {
      andConditions.push(officeCondition);
    }

    if (fromDate || toDate) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (fromDate) {
        const d = new Date(fromDate);
        d.setHours(0, 0, 0, 0);
        dateFilter.gte = d;
      }
      if (toDate) {
        const d = new Date(toDate);
        d.setHours(23, 59, 59, 999);
        dateFilter.lte = d;
      }
      andConditions.push({ nextFollowupAt: dateFilter });
    }

    if (leadOwner) {
      andConditions.push({ createdById: leadOwner });
    }

    if (assignedUser) {
      andConditions.push({ assignedUserId: assignedUser });
    }

    if (leadStatus) {
      andConditions.push({ leadStatus });
    }

    if (country) {
      andConditions.push({ country });
    }

    if (state) {
      andConditions.push({ state });
    }

    const where: Prisma.LeadWhereInput =
      andConditions.length === 1 ? andConditions[0] : { AND: andConditions };

    const records = await prisma.lead.findMany({
      where,
      orderBy: [{ nextFollowupAt: "asc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        countryCode: true,
        mobileNumber: true,
        nextFollowupAt: true,
        leadStatus: true,
        assignedUser: true,
        creator: {
          select: {
            name: true,
            email: true,
            officeLocationName: true,
            officeLocationRef: { select: { officeName: true, location: true } }
          }
        }
      },
    });

    const reportData = records.map((r) => {
      const officeLoc = r.creator?.officeLocationName?.trim() || [r.creator?.officeLocationRef?.officeName, r.creator?.officeLocationRef?.location].filter(Boolean).join(" - ");
      return {
        id: r.id,
        leadName: [r.firstName, r.lastName].filter(Boolean).join(" "),
        customerName: [r.firstName, r.lastName].filter(Boolean).join(" "),
        mobile: `${r.countryCode} ${r.mobileNumber}`.trim(),
        followupDate: r.nextFollowupAt ? r.nextFollowupAt.toISOString() : "",
        followupTime: r.nextFollowupAt ? r.nextFollowupAt.toISOString() : "",
        leadStatus: r.leadStatus,
        assignedUser: r.assignedUser || "Unassigned",
        officeLocation: officeLoc || "Not Assigned",
        createdBy: r.creator?.name?.trim() || r.creator?.email || "Unknown",
      };
    });

    return jsonOk({ items: reportData });
  } catch (error) {
    console.error("Failed to fetch followup report", error);
    return jsonError("Unable to generate followup report.", 500);
  }
}
