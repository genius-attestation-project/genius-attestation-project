import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/middleware/auth.middleware";
import {
  listCorporateDetails,
  createCorporateDetail,
} from "@/features/corporate-details/server/corporate-detail.service";

export async function GET(request: NextRequest) {
  try {
    const session = await requirePermission("dashboard.view", "/api/master-data/corporate-details");
    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }
    const ownerAdminId = session.user.ownerAdminId!;

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    const activeOnly = searchParams.get("active") === "true";
    const approvalStatus = searchParams.get("approvalStatus") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");

    const result = await listCorporateDetails(ownerAdminId, {
      query,
      activeOnly,
      approvalStatus,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[GET /api/master-data/corporate-details] Error:", error);
    return NextResponse.json({ message: error.message || "Failed to fetch corporate details" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("dashboard.view", "/api/master-data/corporate-details");
    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }
    const ownerAdminId = session.user.ownerAdminId!;
    const body = await request.json();

    const created = await createCorporateDetail(
      ownerAdminId,
      body,
      session.user.name || session.user.email || "System User"
    );

    return NextResponse.json({ item: created, message: "Corporate detail created." }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/master-data/corporate-details] Error:", error);
    return NextResponse.json({ message: error.message || "Failed to create corporate detail" }, { status: 400 });
  }
}
