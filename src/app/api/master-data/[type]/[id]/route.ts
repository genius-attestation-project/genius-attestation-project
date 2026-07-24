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
    const { name, category, description, isActive, sortOrder, subPackageIds } = body;

    // Dedicated handler for Sub Packages
    if (rawSlug === "sub-packages" || type === "SUB_PACKAGES") {
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
    const isProcessType = rawSlug === "process-types" || type === "PROCESS_TYPES";

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

    let trimmedCategory = existing.category;
    if (category !== undefined) {
      trimmedCategory = String(category).trim().slice(0, 100);
      if (isDocumentType && !trimmedCategory) {
        return NextResponse.json({ message: "Category is required" }, { status: 400 });
      }
    }

    const updateData: any = {
      name: trimmedName,
      category: trimmedCategory || "General",
      description: description !== undefined ? (String(description).trim() || null) : existing.description,
      isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      sortOrder: sortOrder !== undefined ? sortOrder : existing.sortOrder,
      updatedBy: session.user.id,
    };

    if (isProcessType && Array.isArray(subPackageIds)) {
      updateData.subPackages = {
        set: subPackageIds.map((id: string) => ({ id })),
      };
    }

    const updatedItem = await prisma.masterData.update({
      where: { id: params.id },
      data: updateData,
      include: isProcessType ? { subPackages: true } : undefined,
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

    if (rawSlug === "sub-packages" || type === "SUB_PACKAGES") {
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
