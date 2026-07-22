import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildReportFilters, applyFiltersToRegistration, applyFiltersToProcess } from "@/features/reports/server/report-filters";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
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
    
    const regWhere = applyFiltersToRegistration(filters.baseWhere, filters);
    const processWhere = applyFiltersToProcess(filters.baseWhere, filters);

    const finalWhere = {
      ...processWhere,
      registration: regWhere
    };

    const skip = (page - 1) * limit;

    const [processData, total] = await Promise.all([
      prisma.processAssignment.findMany({
        where: finalWhere,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.processAssignment.count({ where: finalWhere })
    ]);

    return NextResponse.json({
      data: processData,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("Error fetching detailed process:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
