import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/features/admin/server/rbac.service";
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
    const session = await auth();
    if (!session?.user?.ownerAdminId) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const isSuperAdmin = Boolean(session.user.isSuperAdmin);
    const hasMasterConfig =
      isSuperAdmin ||
      hasPermission(session.user, "master_configuration.corporate_details.view") ||
      hasPermission(session.user, "master_configuration.view") ||
      hasPermission(session.user, "master_configuration.manage");

    const hasLeadCreateOrEdit =
      hasPermission(session.user, "leads.create") ||
      hasPermission(session.user, "leads.edit");

    const hasRevenueRegistration =
      hasPermission(session.user, "revenue_registration.view") ||
      hasPermission(session.user, "revenue_registration.create") ||
      hasPermission(session.user, "revenue_registration.edit");

    const isLookupConsumer =
      !hasMasterConfig &&
      (hasLeadCreateOrEdit ||
        hasRevenueRegistration ||
        hasPermission(session.user, "dashboard.view"));

    if (!hasMasterConfig && !isLookupConsumer) {
      return NextResponse.json(
        { message: "Forbidden. Access to corporate details is restricted." },
        { status: 403 }
      );
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
    const session = await auth();
    if (!session?.user?.ownerAdminId) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const isSuperAdmin = Boolean(session.user.isSuperAdmin);
    const canEdit =
      isSuperAdmin ||
      hasPermission(session.user, "master_configuration.corporate_details.edit") ||
      hasPermission(session.user, "master_configuration.manage");

    if (!canEdit) {
      return NextResponse.json(
        { message: "Forbidden. You do not have permission to edit corporate details." },
        { status: 403 }
      );
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
    const session = await auth();
    if (!session?.user?.ownerAdminId) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const isSuperAdmin = Boolean(session.user.isSuperAdmin);
    const canDelete =
      isSuperAdmin ||
      hasPermission(session.user, "master_configuration.corporate_details.delete") ||
      hasPermission(session.user, "master_configuration.manage");

    if (!canDelete) {
      return NextResponse.json(
        { message: "Forbidden. You do not have permission to delete corporate details." },
        { status: 403 }
      );
    }

    await deleteCorporateDetail(session.user.ownerAdminId!, id);
    return NextResponse.json({ message: "Record deleted." });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Failed to delete record" }, { status: 400 });
  }
}
