import { NextResponse } from "next/server";

import { hasPermission } from "@/features/admin/server/rbac.service";
import {
  deleteAdvancePaymentApproval,
  updateAdvancePaymentApproval,
} from "@/features/revenue/server/advance-payment-approval.service";
import { auth } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.ownerAdminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAuthorized =
      session.user.isSuperAdmin ||
      hasPermission(session.user, "advance_payment_approval.approve") ||
      hasPermission(session.user, "pending_approval.edit") ||
      hasPermission(session.user, "pendingApproval.approve");

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "You do not have permission to edit advance payment records." },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null;

    const result = await updateAdvancePaymentApproval({
      ownerAdminId: session.user.ownerAdminId,
      approvalId: id,
      updatedByUserId: session.user.id,
      advanceAmount: body.advanceAmount !== undefined ? Number(body.advanceAmount) : undefined,
      paymentDate: body.paymentDate,
      paymentMode: body.paymentMode,
      remarks: body.remarks,
      status: body.status,
      ipAddress,
    });

    return NextResponse.json({ success: true, item: result });
  } catch (error: any) {
    console.error("[PUT /api/advance-payment-approvals/[id]] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update advance payment record." },
      { status: 400 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return PUT(request, { params });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.ownerAdminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAuthorized =
      session.user.isSuperAdmin ||
      hasPermission(session.user, "advance_payment_approval.approve") ||
      hasPermission(session.user, "pending_approval.edit") ||
      hasPermission(session.user, "pendingApproval.approve");

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "You do not have permission to delete advance payment records." },
        { status: 403 },
      );
    }

    const { id } = await params;
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null;

    const result = await deleteAdvancePaymentApproval({
      ownerAdminId: session.user.ownerAdminId,
      approvalId: id,
      deletedByUserId: session.user.id,
      ipAddress,
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("[DELETE /api/advance-payment-approvals/[id]] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete advance payment record." },
      { status: 400 },
    );
  }
}
