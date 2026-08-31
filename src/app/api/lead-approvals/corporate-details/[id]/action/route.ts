import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/middleware/auth.middleware";
import {
  approveCorporateDetail,
  rejectCorporateDetail,
  updateCorporateDetail,
} from "@/features/corporate-details/server/corporate-detail.service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const session = await requirePermission("pending_approval.edit", `/api/lead-approvals/corporate-details/${id}/action`);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }
    const ownerAdminId = session.user.ownerAdminId!;
    const body = await request.json();
    const { action, rejectionReason, updates } = body;

    const performedBy = session.user.name || session.user.email || "Approver User";

    if (action === "approve") {
      const approved = await approveCorporateDetail(ownerAdminId, id, performedBy, updates);
      return NextResponse.json({ item: approved, message: "Corporate Detail approved successfully." });
    }

    if (action === "reject") {
      const rejected = await rejectCorporateDetail(ownerAdminId, id, performedBy, rejectionReason);
      return NextResponse.json({ item: rejected, message: "Corporate Detail rejected." });
    }

    if (action === "edit") {
      const updated = await updateCorporateDetail(ownerAdminId, id, updates, performedBy);
      return NextResponse.json({ item: updated, message: "Corporate Detail updated." });
    }

    return NextResponse.json({ message: "Invalid action." }, { status: 400 });
  } catch (error: any) {
    console.error("[POST /api/lead-approvals/corporate-details/[id]/action] Error:", error);
    return NextResponse.json({ message: error.message || "Failed to process approval action" }, { status: 400 });
  }
}
