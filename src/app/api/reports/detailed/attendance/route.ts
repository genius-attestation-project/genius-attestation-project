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
    const assignedUser = searchParams.get("assignedUser");
    const attendanceStatus = searchParams.get("attendanceStatus");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const ownerAdminId = session.user.ownerAdminId || session.user.id;
    const filters = buildReportFilters(searchParams, ownerAdminId);
    const baseWhere = filters.baseWhere;
    const leadWhere = applyFiltersToLead(baseWhere, filters);
    const regWhere = applyFiltersToRegistration(baseWhere, filters);

    if (assignedUser) {
      baseWhere.userId = assignedUser;
    }

    if (attendanceStatus) {
      baseWhere.status = attendanceStatus;
    }

    const skip = (page - 1) * limit;

    const [attendance, total] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: baseWhere,
        skip,
        take: limit,
        orderBy: { attendanceDate: 'desc' },
        include: {
          user: { select: { name: true } }
        }
      }),
      prisma.attendanceRecord.count({ where: baseWhere })
    ]);

    return NextResponse.json({
      data: attendance,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("Error fetching detailed attendance:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
