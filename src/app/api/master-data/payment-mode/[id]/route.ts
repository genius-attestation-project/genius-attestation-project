import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/middleware/auth.middleware";

/**
 * GET /api/master-data/payment-mode/[id]
 * Fetch a single payment mode with its audit logs.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const session = await requirePermission(
      "master_configuration.view",
      `/api/master-data/payment-mode/${id}`
    );
    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }
    const ownerAdminId = session.user.ownerAdminId!;

    const item = await prisma.paymentMode.findFirst({
      where: { id, ownerAdminId, deletedAt: null },
      include: {
        auditLogs: {
          orderBy: { timestamp: "desc" },
          take: 50,
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { message: "Payment Mode not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ item: { ...item, name: item.paymentModeName } });
  } catch (error: any) {
    console.error(`[GET /api/master-data/payment-mode/${id}] Error:`, error);
    return NextResponse.json(
      { message: "Failed to fetch payment mode." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/master-data/payment-mode/[id]
 * Update name, description, or status. Writes detailed audit log.
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const session = await requirePermission(
      "master_configuration.view",
      `/api/master-data/payment-mode/${id}`
    );
    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }
    const ownerAdminId = session.user.ownerAdminId!;
    const userId = session.user.id;
    const userName =
      (session.user as any).name ||
      (session.user as any).fullName ||
      session.user.email ||
      userId;

    const existing = await prisma.paymentMode.findFirst({
      where: { id, ownerAdminId, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json(
        { message: "Payment Mode not found." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { paymentModeName, description, status, displayOrder } = body;

    // Build update payload
    const updateData: any = { updatedBy: userName };
    const auditDetails: string[] = [];

    if (paymentModeName !== undefined) {
      const trimmedName = paymentModeName.trim();
      if (!trimmedName) {
        return NextResponse.json(
          { message: "Payment Mode Name cannot be empty." },
          { status: 400 }
        );
      }
      if (trimmedName !== existing.paymentModeName) {
        // Duplicate check
        const duplicate = await prisma.paymentMode.findFirst({
          where: {
            ownerAdminId,
            paymentModeName: trimmedName,
            deletedAt: null,
            NOT: { id },
          },
        });
        if (duplicate) {
          return NextResponse.json(
            { message: "A Payment Mode with this name already exists." },
            { status: 409 }
          );
        }
        updateData.paymentModeName = trimmedName;
        auditDetails.push(
          `Name changed from "${existing.paymentModeName}" to "${trimmedName}".`
        );
      }
    }

    if (description !== undefined) {
      const trimmedDesc = (description || "").trim() || null;
      updateData.description = trimmedDesc;
      if (trimmedDesc !== existing.description) {
        auditDetails.push("Description updated.");
      }
    }

    if (status !== undefined) {
      const validStatus = status === "Inactive" ? "Inactive" : "Active";
      if (validStatus !== existing.status) {
        updateData.status = validStatus;
        auditDetails.push(
          `Status changed from "${existing.status}" to "${validStatus}".`
        );
      }
    }

    if (displayOrder !== undefined && typeof displayOrder === "number") {
      updateData.displayOrder = displayOrder;
    }

    const updated = await prisma.paymentMode.update({
      where: { id },
      data: updateData,
    });

    // Determine audit action
    let action = "UPDATED";
    if (updateData.status === "Active" && existing.status === "Inactive") {
      action = "ACTIVATED";
    } else if (updateData.status === "Inactive" && existing.status === "Active") {
      action = "DEACTIVATED";
    }

    if (auditDetails.length > 0) {
      await prisma.paymentModeAuditLog.create({
        data: {
          paymentModeId: id,
          action,
          performedBy: userId,
          performedByName: userName,
          details: auditDetails.join(" "),
          ownerAdminId,
        },
      });
    }

    return NextResponse.json({ item: { ...updated, name: updated.paymentModeName } });
  } catch (error: any) {
    console.error(`[PUT /api/master-data/payment-mode/${id}] Error:`, error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { message: "A Payment Mode with this name already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: "Failed to update payment mode." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/master-data/payment-mode/[id]
 * Soft delete (sets deletedAt). Writes audit log.
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const session = await requirePermission(
      "master_configuration.view",
      `/api/master-data/payment-mode/${id}`
    );
    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }
    const ownerAdminId = session.user.ownerAdminId!;
    const userId = session.user.id;
    const userName =
      (session.user as any).name ||
      (session.user as any).fullName ||
      session.user.email ||
      userId;

    const existing = await prisma.paymentMode.findFirst({
      where: { id, ownerAdminId, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json(
        { message: "Payment Mode not found." },
        { status: 404 }
      );
    }

    // Soft delete
    await prisma.paymentMode.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userName,
        updatedBy: userName,
      },
    });

    await prisma.paymentModeAuditLog.create({
      data: {
        paymentModeId: id,
        action: "DELETED",
        performedBy: userId,
        performedByName: userName,
        details: `Payment Mode "${existing.paymentModeName}" deleted.`,
        ownerAdminId,
      },
    });

    return NextResponse.json({ message: "Payment Mode deleted successfully." });
  } catch (error: any) {
    console.error(`[DELETE /api/master-data/payment-mode/${id}] Error:`, error);
    return NextResponse.json(
      { message: "Failed to delete payment mode." },
      { status: 500 }
    );
  }
}
