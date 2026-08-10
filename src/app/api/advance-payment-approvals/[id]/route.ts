import { NextResponse } from "next/server";

import { hasPermission } from "@/features/admin/server/rbac.service";
import {
  updateAdvancePaymentApproval,
  deleteAdvancePaymentApproval,
} from "@/features/revenue/server/advance-payment-approval.service";
import { auth } from "@/lib/auth";

export async function PATCH(
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
      hasPermission(session.user, "advance_payment_approval.edit") ||
      hasPermission(session.user, "pending_approval.edit") ||
      hasPermission(session.user, "pendingApproval.approve");

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "You do not have permission to edit advance payments." },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null;

    const result = await updateAdvancePaymentApproval({
      ownerAdminId: session.user.ownerAdminId,
      approvalId: id,
      performedByUserId: session.user.id,
      advanceAmount: body.advanceAmount !== undefined ? Number(body.advanceAmount) : undefined,
      paymentDate: body.paymentDate,
      paymentMode: body.paymentMode,
      referenceNumber: body.referenceNumber,
      remarks: body.remarks,
      ipAddress,
    });

    return NextResponse.json({ success: true, item: result });
  } catch (error: any) {
    console.error("[PATCH /api/advance-payment-approvals/[id]] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update advance payment." },
      { status: 400 },
    );
  }
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
      hasPermission(session.user, "advance_payment_approval.delete") ||
      hasPermission(session.user, "pending_approval.edit") ||
      hasPermission(session.user, "pendingApproval.approve");

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "You do not have permission to delete advance payments." },
        { status: 403 },
      );
    }

    const { id } = await params;
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null;

    const result = await deleteAdvancePaymentApproval({
      ownerAdminId: session.user.ownerAdminId,
      approvalId: id,
      performedByUserId: session.user.id,
      ipAddress,
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("[DELETE /api/advance-payment-approvals/[id]] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete advance payment." },
      { status: 400 },
    );
  }
}
