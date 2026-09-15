import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/features/admin/server/rbac.service";

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
    const session = await auth();
    if (!session?.user?.ownerAdminId) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const isSuperAdmin = Boolean(session.user.isSuperAdmin);
    const hasMasterConfig =
      isSuperAdmin ||
      hasPermission(session.user, "master_configuration.payment_mode.view") ||
      hasPermission(session.user, "master_configuration.view") ||
      hasPermission(session.user, "master_configuration.manage");

    const hasRevenueRegistration =
      hasPermission(session.user, "revenue_registration.view") ||
      hasPermission(session.user, "revenue_registration.create") ||
      hasPermission(session.user, "revenue_registration.edit") ||
      hasPermission(session.user, "revenue.view") ||
      hasPermission(session.user, "revenue.create") ||
      hasPermission(session.user, "revenue.edit") ||
      hasPermission(session.user, "account_panel.view");

    if (!hasMasterConfig && !hasRevenueRegistration) {
      return NextResponse.json(
        { message: "Forbidden. Access to this payment mode is restricted." },
        { status: 403 }
      );
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
    const session = await auth();
    if (!session?.user?.ownerAdminId) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const isSuperAdmin = Boolean(session.user.isSuperAdmin);
    const canEdit =
      isSuperAdmin ||
      hasPermission(session.user, "master_configuration.payment_mode.edit") ||
      hasPermission(session.user, "master_configuration.manage");

    if (!canEdit) {
      return NextResponse.json(
        { message: "Forbidden. You do not have permission to edit payment modes." },
        { status: 403 }
      );
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

    if (description !== undefined && description !== existing.description) {
      updateData.description = description ? description.trim() : null;
      auditDetails.push("Description was updated.");
    }

    if (status !== undefined && status !== existing.status) {
      if (!["Active", "Inactive"].includes(status)) {
        return NextResponse.json(
          { message: "Status must be Active or Inactive." },
          { status: 400 }
        );
      }
      updateData.status = status;
      auditDetails.push(
        `Status changed from "${existing.status}" to "${status}".`
      );
    }

    if (
      displayOrder !== undefined &&
      displayOrder !== existing.displayOrder
    ) {
      const parsedOrder = parseInt(displayOrder);
      if (isNaN(parsedOrder) || parsedOrder < 0) {
        return NextResponse.json(
          { message: "Display Order must be a positive integer." },
          { status: 400 }
        );
      }
      updateData.displayOrder = parsedOrder;
      auditDetails.push(
        `Display Order changed from ${existing.displayOrder} to ${parsedOrder}.`
      );
    }

    // If nothing changed, return existing
    if (Object.keys(updateData).length === 1) {
      return NextResponse.json({
        item: { ...existing, name: existing.paymentModeName },
        message: "No changes detected.",
      });
    }

    // Perform update + create audit logs inside transaction
    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.paymentMode.update({
        where: { id },
        data: updateData,
      });

      // Write an audit log entry for each recorded change
      if (auditDetails.length > 0) {
        await tx.paymentModeAuditLog.createMany({
          data: auditDetails.map((details) => ({
            paymentModeId: id,
            action: "UPDATE",
            details,
            performedBy: userId,
            performedByName: userName,
            ownerAdminId,
          })),
        });
      }

      return res;
    });

    return NextResponse.json({
      item: { ...updated, name: updated.paymentModeName },
      message: "Payment Mode updated successfully.",
    });
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
    const session = await auth();
    if (!session?.user?.ownerAdminId) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const isSuperAdmin = Boolean(session.user.isSuperAdmin);
    const canDelete =
      isSuperAdmin ||
      hasPermission(session.user, "master_configuration.payment_mode.delete") ||
      hasPermission(session.user, "master_configuration.manage");

    if (!canDelete) {
      return NextResponse.json(
        { message: "Forbidden. You do not have permission to delete payment modes." },
        { status: 403 }
      );
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

    await prisma.$transaction(async (tx) => {
      await tx.paymentMode.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          deletedBy: userName,
        },
      });

      await tx.paymentModeAuditLog.create({
        data: {
          paymentModeId: id,
          action: "DELETE",
          details: `Payment Mode "${existing.paymentModeName}" was deleted by ${userName}.`,
          performedBy: userId,
          performedByName: userName,
          ownerAdminId,
        },
      });
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
