import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/middleware/auth.middleware";
import { listCorporateDetails } from "@/features/corporate-details/server/corporate-detail.service";

export async function GET(request: NextRequest) {
  try {
    const session = await requirePermission("corporate_details_approval.view", "/api/lead-approvals/corporate-details");
    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }
    const ownerAdminId = session.user.ownerAdminId!;

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");

    const result = await listCorporateDetails(ownerAdminId, {
      query,
      approvalStatus: "Pending Approval",
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[GET /api/lead-approvals/corporate-details] Error:", error);
    return NextResponse.json({ message: error.message || "Failed to fetch pending corporate approvals" }, { status: 500 });
  }
}
