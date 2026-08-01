import { NextResponse } from "next/server";

import { hasPermission } from "@/features/admin/server/rbac.service";
import { approveAdvancePayment } from "@/features/revenue/server/advance-payment-approval.service";
import { auth } from "@/lib/auth";

export async function POST(
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
        { error: "You do not have permission to approve advance payments." },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const remarks = body.remarks || body.reason || null;
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null;

    const result = await approveAdvancePayment({
      ownerAdminId: session.user.ownerAdminId,
      approvalId: id,
      approvedByUserId: session.user.id,
      remarks,
      ipAddress,
    });

    return NextResponse.json({ success: true, item: result });
  } catch (error: any) {
    console.error("[POST /api/advance-payment-approvals/[id]/approve] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to approve advance payment." },
      { status: 400 },
    );
  }
}
