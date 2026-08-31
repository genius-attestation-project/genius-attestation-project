import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildReportFilters, applyFiltersToLead, applyFiltersToFollowup } from "@/features/reports/server/report-filters";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get("dateRange") || "all";
    const assignedUser = searchParams.get("assignedUser");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const ownerAdminId = session.user.ownerAdminId || session.user.id;
    const filters = buildReportFilters(searchParams, ownerAdminId);
    const followupWhere = applyFiltersToFollowup(filters.baseWhere, filters);
    const leadWhere = applyFiltersToLead(filters.baseWhere, filters);

    if (assignedUser) {
      followupWhere.userId = assignedUser;
    }

    const finalWhere = {
      ...followupWhere,
      lead: leadWhere
    };

    const skip = (page - 1) * limit;

    const [followups, total] = await Promise.all([
      prisma.leadFollowupHistory.findMany({
        where: finalWhere,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          lead: { select: { firstName: true, lastName: true, leadCode: true } }
        }
      }),
      prisma.leadFollowupHistory.count({ where: finalWhere })
    ]);

    return NextResponse.json({
      data: followups,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("Error fetching detailed followups:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
