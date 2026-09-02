import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/features/admin/server/rbac.service";

const normalizeName = (str: string) => str.replace(/\s+/g, "").toLowerCase();

function getMasterDataPermissionKey(slug: string, action: "view" | "create" | "edit" | "delete") {
  const normalized = slug.toLowerCase().replace(/_/g, "-");
  switch (normalized) {
    case "document-types":
      return `master_configuration.document_types.${action}`;
    case "document-type-categories":
      return `master_configuration.document_type_categories.${action}`;
    case "process-types":
    case "attestation-types":
      return `master_configuration.process_types.${action}`;
    case "sub-process":
      return `master_configuration.sub_process.${action}`;
    case "customer-types":
      return `master_configuration.customer_types.${action}`;
    case "corporate-details":
      return `master_configuration.corporate_details.${action}`;
    case "payment-mode":
      return `master_configuration.payment_mode.${action}`;
    case "courier-companies":
      return `master_configuration.courier_companies.${action}`;
    case "departments":
      return `departments.${action}`;
    case "office-locations":
      return `office_locations.${action}`;
    default:
      return `master_configuration.${action}`;
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ type: string }> }
) {
  const params = await context.params;
  try {
    const session = await auth();
    if (!session?.user?.ownerAdminId) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }
    const rawSlug = params.type.toLowerCase();
    const permKey = getMasterDataPermissionKey(rawSlug, "view");
    if (
      !session.user.isSuperAdmin &&
      !hasPermission(session.user, permKey) &&
      !hasPermission(session.user, "master_configuration.view")
    ) {
      return NextResponse.json({ message: "Forbidden. Access to this configuration is restricted." }, { status: 403 });
    }
    const ownerAdminId = session.user.ownerAdminId!;

    const type = params.type.toUpperCase().replace(/-/g, "_");
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    const activeOnly = searchParams.get("active") === "true";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");
    const skip = (page - 1) * pageSize;

    // Dedicated handler for Document Type Categories
    if (rawSlug === "document-type-categories" || type === "DOCUMENT_TYPE_CATEGORIES") {
      const whereClause: any = { ownerAdminId };
      if (activeOnly) whereClause.isActive = true;
      if (query) {
        whereClause.OR = [
          { name: { contains: query } },
          { description: { contains: query } },
        ];
      }

      const [items, total] = await Promise.all([
        prisma.documentTypeCategory.findMany({
          where: whereClause,
          orderBy: { createdAt: "desc" },
          skip,
          take: pageSize,
        }),
        prisma.documentTypeCategory.count({ where: whereClause }),
      ]);

      const groupStats = await prisma.documentTypeCategory.groupBy({
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

    // Dedicated handler for Sub Process / Sub Packages
    if (rawSlug === "sub-process" || rawSlug === "sub-packages" || type === "SUB_PROCESS" || type === "SUB_PACKAGES") {
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

    // Generic MasterData handler (including Process Types & Document Types & Customer Types)
    let targetType = type;
    const isCustomerType = rawSlug === "customer-types" || type === "CUSTOMER_TYPES";
    if (isCustomerType) {
      targetType = "CUSTOMER_TYPES";
      // Auto seed default Individual and Corporate records if none exist for this tenant
      const count = await prisma.masterData.count({
        where: { type: "CUSTOMER_TYPES", ownerAdminId, isArchived: false },
      });
      if (count === 0) {
        await prisma.masterData.createMany({
          data: [
            { type: "CUSTOMER_TYPES", name: "Individual", sortOrder: 1, ownerAdminId, isActive: true },
            { type: "CUSTOMER_TYPES", name: "Corporate", sortOrder: 2, ownerAdminId, isActive: true },
          ],
          skipDuplicates: true,
        });
      }
    }

    const whereClause: any = {
      type: targetType,
      isArchived: false,
      ownerAdminId,
    };

    const isProcessType = rawSlug === "attestation-types" || rawSlug === "process-types" || type === "ATTESTATION_TYPES" || type === "PROCESS_TYPES";
    const isDocumentType = rawSlug === "document-types" || type === "DOCUMENT_TYPES";

    if (isProcessType) {
      whereClause.type = "PROCESS_TYPES";
    }

    const coreSubPackageId = searchParams.get("coreSubPackageId") || "";
    if (isProcessType && coreSubPackageId) {
      whereClause.coreSubPackageId = coreSubPackageId;
    }

    if (query) {
      if (isProcessType) {
        whereClause.OR = [
          { name: { contains: query } },
          { category: { contains: query } },
          { description: { contains: query } },
          { coreSubPackage: { name: { contains: query } } },
          { subPackages: { some: { name: { contains: query } } } },
        ];
      } else {
        whereClause.OR = [
          { name: { contains: query } },
          { category: { contains: query } },
          { description: { contains: query } },
        ];
      }
    }

    const [items, total] = await Promise.all([
      prisma.masterData.findMany({
        where: whereClause,
        include: {
          subPackages: isProcessType,
          coreSubPackage: isProcessType,
          categoryRel: isDocumentType,
        },
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
    const session = await auth();
    if (!session?.user?.ownerAdminId) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }
    const rawSlug = params.type.toLowerCase();
    const permKey = getMasterDataPermissionKey(rawSlug, "create");
    if (
      !session.user.isSuperAdmin &&
      !hasPermission(session.user, permKey) &&
      !hasPermission(session.user, "master_configuration.manage")
    ) {
      return NextResponse.json({ message: "Forbidden. You do not have permission to create this configuration." }, { status: 403 });
    }
    const ownerAdminId = session.user.ownerAdminId!;

    const type = params.type.toUpperCase().replace(/-/g, "_");
    const body = await request.json();
    const { name, category, categoryId, description, isActive, sortOrder, subPackageIds, coreSubPackageId } = body;

    const trimmedName = (name || "").trim().slice(0, 100);
    if (!trimmedName) {
      return NextResponse.json({ message: "Name is required" }, { status: 400 });
    }

    // Dedicated handler for Document Type Categories
    if (rawSlug === "document-type-categories" || type === "DOCUMENT_TYPE_CATEGORIES") {
      const existing = await prisma.documentTypeCategory.findMany({
        where: { ownerAdminId },
        select: { name: true },
      });

      const targetNorm = normalizeName(trimmedName);
      const isDuplicate = existing.some(r => normalizeName(r.name) === targetNorm);
      if (isDuplicate) {
        return NextResponse.json({ message: "A category with this name already exists." }, { status: 409 });
      }

      const newItem = await prisma.documentTypeCategory.create({
        data: {
          name: trimmedName,
          description: (description || "").trim() || null,
          isActive: isActive !== undefined ? Boolean(isActive) : true,
          ownerAdminId,
        },
      });

      return NextResponse.json({ item: newItem }, { status: 201 });
    }

    // Dedicated handler for Sub Process / Sub Packages
    if (rawSlug === "sub-process" || rawSlug === "sub-packages" || type === "SUB_PROCESS" || type === "SUB_PACKAGES") {
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
    const isProcessType = rawSlug === "attestation-types" || rawSlug === "process-types" || type === "ATTESTATION_TYPES" || type === "PROCESS_TYPES";
    const targetType = isProcessType ? "PROCESS_TYPES" : type;

    let finalCategoryId: string | null = categoryId || null;
    let finalCategoryName = (category || "").trim().slice(0, 100);

    if (isDocumentType) {
      if (finalCategoryId) {
        const catRecord = await prisma.documentTypeCategory.findUnique({
          where: { id: finalCategoryId },
        });
        if (catRecord) {
          finalCategoryName = catRecord.name;
        }
      } else if (finalCategoryName) {
        // Find or create category record by name
        let catRecord = await prisma.documentTypeCategory.findFirst({
          where: {
            ownerAdminId,
            name: { equals: finalCategoryName },
          },
        });
        if (!catRecord) {
          catRecord = await prisma.documentTypeCategory.create({
            data: {
              name: finalCategoryName,
              ownerAdminId,
            },
          });
        }
        finalCategoryId = catRecord.id;
      } else {
        return NextResponse.json({ message: "Category is required" }, { status: 400 });
      }
    }

    const existingRecords = await prisma.masterData.findMany({
      where: {
        type: targetType,
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

    const idsToConnect = Array.isArray(subPackageIds) ? subPackageIds : [];

    if (isProcessType && coreSubPackageId) {
      const validCore = await prisma.subPackage.findFirst({
        where: { id: coreSubPackageId, ownerAdminId },
      });
      if (!validCore) {
        return NextResponse.json({ message: "Selected Main Process was not found." }, { status: 400 });
      }
    }

    const newItem = await prisma.masterData.create({
      data: {
        type,
        name: trimmedName,
        category: finalCategoryName || "General",
        categoryId: finalCategoryId,
        description: (description || "").trim() || null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        sortOrder: sortOrder || 0,
        ownerAdminId,
        createdBy: session.user.id,
        coreSubPackageId: isProcessType && coreSubPackageId ? coreSubPackageId : null,
        subPackages: isProcessType && idsToConnect.length > 0 ? {
          connect: idsToConnect.map((id: string) => ({ id }))
        } : undefined,
      },
      include: {
        subPackages: isProcessType,
        coreSubPackage: isProcessType,
        categoryRel: isDocumentType,
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
