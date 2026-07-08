import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildReportFilters, applyFiltersToDocumentMovement } from "@/features/reports/server/report-filters";
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
    const docWhere = applyFiltersToDocumentMovement(filters.baseWhere, filters);

    const skip = (page - 1) * limit;

    const [movements, total] = await Promise.all([
      prisma.documentMovement.findMany({
        where: docWhere,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          fromOffice: { select: { officeName: true } },
          toOffice: { select: { officeName: true } },
          currentOffice: { select: { officeName: true } },
        }
      }),
      prisma.documentMovement.count({ where: docWhere })
    ]);

    return NextResponse.json({
      data: movements,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("Error fetching detailed bm-movements:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
