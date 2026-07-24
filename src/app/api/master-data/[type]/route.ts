import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/middleware/auth.middleware";

const normalizeName = (str: string) => str.replace(/\s+/g, "").toLowerCase();

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

    const rawSlug = params.type.toLowerCase();
    const type = params.type.toUpperCase().replace(/-/g, "_");
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    const activeOnly = searchParams.get("active") === "true";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");
    const skip = (page - 1) * pageSize;

    // Dedicated handler for Sub Packages
    if (rawSlug === "sub-packages" || type === "SUB_PACKAGES") {
      const whereClause: any = { ownerAdminId };
      if (activeOnly) whereClause.isActive = true;
      if (query) {
        whereClause.OR = [
          { name: { contains: query } },
          { description: { contains: query } },
        ];
      }

      const [items, total] = await Promise.all([
        prisma.subPackage.findMany({
          where: whereClause,
          orderBy: { createdAt: "desc" },
          skip,
          take: pageSize,
        }),
        prisma.subPackage.count({ where: whereClause }),
      ]);

      const groupStats = await prisma.subPackage.groupBy({
        by: ["isActive"],
        where: { ownerAdminId },
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
    }

    // Generic MasterData handler (including Process Types & Document Types)
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
        { category: { contains: query } },
        { description: { contains: query } },
      ];
    }

    const isProcessType = rawSlug === "process-types" || type === "PROCESS_TYPES";

    const [items, total] = await Promise.all([
      prisma.masterData.findMany({
        where: whereClause,
        include: isProcessType ? { subPackages: true } : undefined,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        skip,
        take: pageSize,
      }),
      prisma.masterData.count({ where: whereClause }),
    ]);

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

    const rawSlug = params.type.toLowerCase();
    const type = params.type.toUpperCase().replace(/-/g, "_");
    const body = await request.json();
    const { name, category, description, isActive, sortOrder, subPackageIds } = body;

    const trimmedName = (name || "").trim().slice(0, 100);
    if (!trimmedName) {
      return NextResponse.json({ message: "Name is required" }, { status: 400 });
    }

    // Dedicated handler for Sub Packages
    if (rawSlug === "sub-packages" || type === "SUB_PACKAGES") {
      const existing = await prisma.subPackage.findMany({
        where: { ownerAdminId },
        select: { name: true },
      });

      const targetNorm = normalizeName(trimmedName);
      const isDuplicate = existing.some(r => normalizeName(r.name) === targetNorm);
      if (isDuplicate) {
        return NextResponse.json({ message: "A record with this name already exists." }, { status: 409 });
      }

      const newItem = await prisma.subPackage.create({
        data: {
          name: trimmedName,
          description: (description || "").trim() || null,
          isActive: isActive !== undefined ? Boolean(isActive) : true,
          ownerAdminId,
        },
      });

      return NextResponse.json({ item: newItem }, { status: 201 });
    }

    // Generic MasterData handler
    const isDocumentType = type === "DOCUMENT_TYPES" || type === "DOCUMENT_TYPE";
    const trimmedCategory = (category || "").trim().slice(0, 100);

    if (isDocumentType && !trimmedCategory) {
      return NextResponse.json({ message: "Category is required" }, { status: 400 });
    }

    const existingRecords = await prisma.masterData.findMany({
      where: {
        type,
        isArchived: false,
        ownerAdminId,
      },
      select: { name: true },
    });

    const targetNorm = normalizeName(trimmedName);
    const isDuplicate = existingRecords.some(r => normalizeName(r.name) === targetNorm);
    if (isDuplicate) {
      return NextResponse.json({ message: "A record with this name already exists." }, { status: 409 });
    }

    const isProcessType = rawSlug === "process-types" || type === "PROCESS_TYPES";
    const idsToConnect = Array.isArray(subPackageIds) ? subPackageIds : [];

    const newItem = await prisma.masterData.create({
      data: {
        type,
        name: trimmedName,
        category: trimmedCategory || "General",
        description: (description || "").trim() || null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        sortOrder: sortOrder || 0,
        ownerAdminId,
        createdBy: session.user.id,
        subPackages: isProcessType && idsToConnect.length > 0 ? {
          connect: idsToConnect.map((id: string) => ({ id }))
        } : undefined,
      },
      include: isProcessType ? { subPackages: true } : undefined,
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
