import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/middleware/auth.middleware";

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

    const body = await request.json();
    const { name, description, isActive, sortOrder } = body;

    const existing = await prisma.masterData.findUnique({
      where: { id: params.id },
    });

    if (!existing || existing.ownerAdminId !== ownerAdminId) {
      return NextResponse.json({ message: "Record not found" }, { status: 404 });
    }

    const updatedItem = await prisma.masterData.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name : existing.name,
        description: description !== undefined ? description : existing.description,
        isActive: isActive !== undefined ? isActive : existing.isActive,
        sortOrder: sortOrder !== undefined ? sortOrder : existing.sortOrder,
        updatedBy: session.user.id,
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
