import { NextResponse } from "next/server";

import { rejectAdvancePayment } from "@/features/revenue/server/advance-payment-approval.service";
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

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const rejectionReason = body.rejectionReason || body.remarks || body.reason || "";
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null;

    if (!rejectionReason.trim()) {
      return NextResponse.json({ error: "Rejection reason is required." }, { status: 400 });
    }

    const result = await rejectAdvancePayment({
      ownerAdminId: session.user.ownerAdminId,
      approvalId: id,
      rejectedByUserId: session.user.id,
      rejectionReason,
      ipAddress,
    });

    return NextResponse.json({ success: true, item: result });
  } catch (error: any) {
    console.error("[POST /api/advance-payment-approvals/[id]/reject] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reject advance payment." },
      { status: 400 },
    );
  }
}
