import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/features/admin/server/rbac.service";
import {
  listCorporateDetails,
  createCorporateDetail,
} from "@/features/corporate-details/server/corporate-detail.service";

export async function GET(request: NextRequest) {
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

    const ownerAdminId = session.user.ownerAdminId!;

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    const activeOnly = searchParams.get("active") === "true" || isLookupConsumer;
    const approvalStatus =
      searchParams.get("approvalStatus") || (isLookupConsumer ? "Approved" : undefined);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(
      searchParams.get("pageSize") || (isLookupConsumer && !searchParams.has("pageSize") ? "200" : "50")
    );

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
    return NextResponse.json(
      { message: error.message || "Failed to fetch corporate details" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.ownerAdminId) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const isSuperAdmin = Boolean(session.user.isSuperAdmin);
    const canCreateCorporate =
      isSuperAdmin ||
      hasPermission(session.user, "master_configuration.corporate_details.create") ||
      hasPermission(session.user, "master_configuration.manage") ||
      hasPermission(session.user, "leads.create") ||
      hasPermission(session.user, "leads.edit");

    if (!canCreateCorporate) {
      return NextResponse.json(
        { message: "Forbidden. You do not have permission to create corporate details." },
        { status: 403 }
      );
    }

    const ownerAdminId = session.user.ownerAdminId!;
    const body = await request.json();

    const created = await createCorporateDetail(
      ownerAdminId,
      body,
      session.user.name || session.user.email || "System User"
    );

    return NextResponse.json(
      { item: created, message: "Corporate detail created." },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[POST /api/master-data/corporate-details] Error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to create corporate detail" },
      { status: 400 }
    );
  }
}
