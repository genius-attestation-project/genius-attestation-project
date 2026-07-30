import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/middleware/auth.middleware";

const normalizeName = (str: string) => str.replace(/\s+/g, "").toLowerCase();

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ type: string; id: string }> }
) {
  const params = await context.params;
  try {
    const session = await requirePermission("admin_management.view", `/api/master-data/${params.type}/${params.id}`);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }
    const ownerAdminId = session.user.ownerAdminId!;

    const rawSlug = params.type.toLowerCase();
    const type = params.type.toUpperCase().replace(/-/g, "_");
    const body = await request.json();
    const { name, category, categoryId, description, isActive, sortOrder, subPackageIds, coreSubPackageId } = body;

    // Dedicated handler for Document Type Categories
    if (rawSlug === "document-type-categories" || type === "DOCUMENT_TYPE_CATEGORIES") {
      const existing = await prisma.documentTypeCategory.findUnique({
        where: { id: params.id },
      });

      if (!existing || existing.ownerAdminId !== ownerAdminId) {
        return NextResponse.json({ message: "Record not found" }, { status: 404 });
      }

      let trimmedName = existing.name;
      if (name !== undefined) {
        trimmedName = String(name).trim().slice(0, 100);
        if (!trimmedName) {
          return NextResponse.json({ message: "Name is required" }, { status: 400 });
        }

        const otherRecords = await prisma.documentTypeCategory.findMany({
          where: {
            ownerAdminId,
            NOT: { id: params.id },
          },
          select: { name: true },
        });

        const targetNorm = normalizeName(trimmedName);
        const isDuplicate = otherRecords.some(r => normalizeName(r.name) === targetNorm);
        if (isDuplicate) {
          return NextResponse.json({ message: "A category with this name already exists." }, { status: 409 });
        }
      }

      const updatedItem = await prisma.documentTypeCategory.update({
        where: { id: params.id },
        data: {
          name: trimmedName,
          description: description !== undefined ? (String(description).trim() || null) : existing.description,
          isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
        },
      });

      // Update string category on linked MasterData records if name changed
      if (existing.name !== trimmedName) {
        await prisma.masterData.updateMany({
          where: {
            type: "DOCUMENT_TYPES",
            ownerAdminId,
            OR: [
              { categoryId: params.id },
              { category: existing.name },
            ],
          },
          data: {
            category: trimmedName,
          },
        });
      }

      return NextResponse.json({ item: updatedItem });
    }

    // Dedicated handler for Sub Process / Sub Packages
    if (rawSlug === "sub-process" || rawSlug === "sub-packages" || type === "SUB_PROCESS" || type === "SUB_PACKAGES") {
      const existing = await prisma.subPackage.findUnique({
        where: { id: params.id },
      });

      if (!existing || existing.ownerAdminId !== ownerAdminId) {
        return NextResponse.json({ message: "Record not found" }, { status: 404 });
      }

      let trimmedName = existing.name;
      if (name !== undefined) {
        trimmedName = String(name).trim().slice(0, 100);
        if (!trimmedName) {
          return NextResponse.json({ message: "Name is required" }, { status: 400 });
        }

        const otherRecords = await prisma.subPackage.findMany({
          where: {
            ownerAdminId,
            NOT: { id: params.id },
          },
          select: { name: true },
        });

        const targetNorm = normalizeName(trimmedName);
        const isDuplicate = otherRecords.some(r => normalizeName(r.name) === targetNorm);
        if (isDuplicate) {
          return NextResponse.json({ message: "A record with this name already exists." }, { status: 409 });
        }
      }

      const updatedItem = await prisma.subPackage.update({
        where: { id: params.id },
        data: {
          name: trimmedName,
          description: description !== undefined ? (String(description).trim() || null) : existing.description,
          isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
        },
      });

      return NextResponse.json({ item: updatedItem });
    }

    // Generic MasterData handler
    const existing = await prisma.masterData.findUnique({
      where: { id: params.id },
    });

    if (!existing || existing.ownerAdminId !== ownerAdminId) {
      return NextResponse.json({ message: "Record not found" }, { status: 404 });
    }

    const isDocumentType = type === "DOCUMENT_TYPES" || type === "DOCUMENT_TYPE";
    const isProcessType = rawSlug === "attestation-types" || rawSlug === "process-types" || type === "ATTESTATION_TYPES" || type === "PROCESS_TYPES";

    let trimmedName = existing.name;
    if (name !== undefined) {
      trimmedName = String(name).trim().slice(0, 100);
      if (!trimmedName) {
        return NextResponse.json({ message: "Name is required" }, { status: 400 });
      }

      const otherRecords = await prisma.masterData.findMany({
        where: {
          type: existing.type,
          isArchived: false,
          ownerAdminId,
          NOT: { id: params.id },
        },
        select: { name: true },
      });

      const targetNorm = normalizeName(trimmedName);
      const isDuplicate = otherRecords.some(r => normalizeName(r.name) === targetNorm);
      if (isDuplicate) {
        return NextResponse.json({ message: "A record with this name already exists." }, { status: 409 });
      }
    }

    let finalCategoryId: string | null = existing.categoryId;
    let finalCategoryName = existing.category;

    if (isDocumentType) {
      if (categoryId !== undefined) {
        finalCategoryId = categoryId || null;
        if (finalCategoryId) {
          const catRecord = await prisma.documentTypeCategory.findUnique({
            where: { id: finalCategoryId },
          });
          if (catRecord) {
            finalCategoryName = catRecord.name;
          }
        }
      } else if (category !== undefined) {
        finalCategoryName = String(category).trim().slice(0, 100);
        if (!finalCategoryName) {
          return NextResponse.json({ message: "Category is required" }, { status: 400 });
        }
        const catRecord = await prisma.documentTypeCategory.findFirst({
          where: { ownerAdminId, name: { equals: finalCategoryName } },
        });
        if (catRecord) {
          finalCategoryId = catRecord.id;
        }
      }
    }

    const updateData: any = {
      name: trimmedName,
      category: finalCategoryName || "General",
      categoryId: finalCategoryId,
      description: description !== undefined ? (String(description).trim() || null) : existing.description,
      isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      sortOrder: sortOrder !== undefined ? sortOrder : existing.sortOrder,
      updatedBy: session.user.id,
    };

    if (isProcessType) {
      if (Array.isArray(subPackageIds)) {
        updateData.subPackages = {
          set: subPackageIds.map((id: string) => ({ id })),
        };
      }
      if (coreSubPackageId !== undefined) {
        if (coreSubPackageId) {
          const validCore = await prisma.subPackage.findFirst({
            where: { id: coreSubPackageId, ownerAdminId },
          });
          if (!validCore) {
            return NextResponse.json({ message: "Selected Main Process was not found." }, { status: 400 });
          }
        }
        updateData.coreSubPackageId = coreSubPackageId || null;
      }
    }

    const updatedItem = await prisma.masterData.update({
      where: { id: params.id },
      data: updateData,
      include: {
        subPackages: isProcessType,
        coreSubPackage: isProcessType,
        categoryRel: isDocumentType,
      },
    });

    return NextResponse.json({ item: updatedItem });
  } catch (error: any) {
    console.error(`[PUT /api/master-data/${params.type}/${params.id}] Error:`, error);
    if (error.code === "P2002") {
      return NextResponse.json({ message: "A record with this name already exists." }, { status: 409 });
    }
    return NextResponse.json(
      { message: "Failed to update master data" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ type: string; id: string }> }
) {
  const params = await context.params;
  try {
    const session = await requirePermission("admin_management.view", `/api/master-data/${params.type}/${params.id}`);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }
    const ownerAdminId = session.user.ownerAdminId!;

    const rawSlug = params.type.toLowerCase();
    const type = params.type.toUpperCase().replace(/-/g, "_");

    // Dedicated handler for Document Type Categories
    if (rawSlug === "document-type-categories" || type === "DOCUMENT_TYPE_CATEGORIES") {
      const existing = await prisma.documentTypeCategory.findUnique({
        where: { id: params.id },
      });

      if (!existing || existing.ownerAdminId !== ownerAdminId) {
        return NextResponse.json({ message: "Record not found" }, { status: 404 });
      }

      // Check if category contains document types
      const linkedCount = await prisma.masterData.count({
        where: {
          type: "DOCUMENT_TYPES",
          isArchived: false,
          ownerAdminId,
          OR: [
            { categoryId: params.id },
            { category: existing.name },
          ],
        },
      });

      if (linkedCount > 0) {
        return NextResponse.json(
          { message: "This category cannot be deleted because it contains Document Types." },
          { status: 400 }
        );
      }

      await prisma.documentTypeCategory.delete({
        where: { id: params.id },
      });

      return NextResponse.json({ success: true, message: "Category deleted." });
    }

    // Dedicated handler for Sub Process / Sub Packages
    if (rawSlug === "sub-process" || rawSlug === "sub-packages" || type === "SUB_PROCESS" || type === "SUB_PACKAGES") {
      const existing = await prisma.subPackage.findUnique({
        where: { id: params.id },
      });

      if (!existing || existing.ownerAdminId !== ownerAdminId) {
        return NextResponse.json({ message: "Record not found" }, { status: 404 });
      }

      await prisma.subPackage.delete({
        where: { id: params.id },
      });

      return NextResponse.json({ success: true, message: "Sub Package deleted." });
    }

    const existing = await prisma.masterData.findUnique({
      where: { id: params.id },
    });

    if (!existing || existing.ownerAdminId !== ownerAdminId) {
      return NextResponse.json({ message: "Record not found" }, { status: 404 });
    }

    // Soft delete
    await prisma.masterData.update({
      where: { id: params.id },
      data: {
        isArchived: true,
        isActive: false,
        deletedBy: session.user.id,
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, message: "Record deleted." });
  } catch (error: any) {
    console.error(`[DELETE /api/master-data/${params.type}/${params.id}] Error:`, error);
    return NextResponse.json(
      { message: "Failed to delete master data" },
      { status: 500 }
    );
  }
}
