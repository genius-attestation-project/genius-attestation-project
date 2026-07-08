import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildReportFilters, applyFiltersToLead, applyFiltersToRegistration } from "@/features/reports/server/report-filters";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get("dateRange") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const ownerAdminId = session.user.ownerAdminId || session.user.id;
    const filters = buildReportFilters(searchParams, ownerAdminId);
    const baseWhere = filters.baseWhere;
    const leadWhere = applyFiltersToLead(baseWhere, filters);
    const regWhere = applyFiltersToRegistration(baseWhere, filters);

    const skip = (page - 1) * limit;

    const [welcomeCalls, total] = await Promise.all([
      prisma.registration.findMany({ where: regWhere,
        skip,
        take: limit,
        orderBy: { welcomeCalledAt: 'desc' },
      }),
      prisma.registration.count({ where: regWhere })
    ]);

    return NextResponse.json({
      data: welcomeCalls,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("Error fetching detailed welcome calls:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
