import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/middleware/auth.middleware";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ type: string }> }
) {
    const params = await context.params;
  try {
    const session = await requirePermission("dashboard.view", `/api/master-data/${params.type}`);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }
    const ownerAdminId = session.user.ownerAdminId!;

    const type = params.type.toUpperCase().replace(/-/g, "_");
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    const activeOnly = searchParams.get("active") === "true";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");
    const skip = (page - 1) * pageSize;

    const whereClause: any = {
      type,
      isArchived: false,
      ownerAdminId,
    };

    if (activeOnly) {
      whereClause.isActive = true;
    }

    if (query) {
      whereClause.OR = [
        { name: { contains: query } },
        { description: { contains: query } },
      ];
    }

    const [items, total] = await Promise.all([
      // @ts-ignore: Stale IDE cache after schema update
      prisma.masterData.findMany({
        where: whereClause,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        skip,
        take: pageSize,
      }),
      // @ts-ignore: Stale IDE cache after schema update
      prisma.masterData.count({ where: whereClause }),
    ]);

    // @ts-ignore: Stale IDE cache after schema update
    const groupStats = await prisma.masterData.groupBy({
      by: ["isActive"],
      where: { type, isArchived: false, ownerAdminId },
      _count: { id: true },
    });

    const activeCount = groupStats.find((s: any) => s.isActive)?._count.id || 0;
    const inactiveCount = groupStats.find((s: any) => !s.isActive)?._count.id || 0;

    return NextResponse.json({
      items,
      total,
      activeCount,
      inactiveCount,
      page,
      pageSize,
    });
  } catch (error: any) {
    console.error(`[GET /api/master-data/${params.type}] Error:`, error);
    return NextResponse.json(
      { message: "Failed to fetch master data" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ type: string }> }
) {
    const params = await context.params;
  try {
    const session = await requirePermission("admin_management.view", `/api/master-data/${params.type}`);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }
    const ownerAdminId = session.user.ownerAdminId!;

    const type = params.type.toUpperCase().replace(/-/g, "_");
    const body = await request.json();
    const { name, description, isActive, sortOrder } = body;

    if (!name) {
      return NextResponse.json({ message: "Name is required" }, { status: 400 });
    }

    // @ts-ignore: Stale IDE cache after schema update
    const newItem = await prisma.masterData.create({
      data: {
        type,
        name,
        description,
        isActive: isActive !== undefined ? isActive : true,
        sortOrder: sortOrder || 0,
        ownerAdminId,
      },
    });

    return NextResponse.json({ item: newItem }, { status: 201 });
  } catch (error: any) {
    console.error(`[POST /api/master-data/${params.type}] Error:`, error);
    if (error.code === "P2002") {
      return NextResponse.json({ message: "A record with this name already exists." }, { status: 409 });
    }
    return NextResponse.json(
      { message: "Failed to create master data" },
      { status: 500 }
    );
  }
}
