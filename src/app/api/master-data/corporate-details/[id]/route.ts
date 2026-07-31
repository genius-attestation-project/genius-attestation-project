import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/middleware/auth.middleware";
import {
  getCorporateDetail,
  updateCorporateDetail,
  deleteCorporateDetail,
} from "@/features/corporate-details/server/corporate-detail.service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const session = await requirePermission("dashboard.view", `/api/master-data/corporate-details/${id}`);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }
    const item = await getCorporateDetail(session.user.ownerAdminId!, id);
    if (!item) return NextResponse.json({ message: "Not found." }, { status: 404 });
    return NextResponse.json(item);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Failed to fetch record" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const session = await requirePermission("dashboard.view", `/api/master-data/corporate-details/${id}`);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }
    const body = await request.json();
    const updated = await updateCorporateDetail(
      session.user.ownerAdminId!,
      id,
      body,
      session.user.name || session.user.email || "System User"
    );
    return NextResponse.json({ item: updated, message: "Record updated." });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Failed to update record" }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const session = await requirePermission("dashboard.view", `/api/master-data/corporate-details/${id}`);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }
    await deleteCorporateDetail(session.user.ownerAdminId!, id);
    return NextResponse.json({ message: "Record deleted." });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Failed to delete record" }, { status: 400 });
  }
}
