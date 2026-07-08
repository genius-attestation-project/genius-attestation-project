import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
    const baseWhere: any = { ownerAdminId };

    const now = new Date();
    let startDate = new Date(0);
    let endDate = now;

    if (dateRange === "today") {
      startDate = new Date(now.setHours(0, 0, 0, 0));
    } else if (dateRange === "thisMonth") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (dateRange === "custom") {
      const start = searchParams.get("startDate");
      const end = searchParams.get("endDate");
      if (start) startDate = new Date(start);
      if (end) endDate = new Date(end);
    }
    
    if (dateRange !== "all") {
      baseWhere.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const skip = (page - 1) * limit;

    const [processData, total] = await Promise.all([
      prisma.processAssignment.findMany({
        where: baseWhere,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.processAssignment.count({ where: baseWhere })
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
