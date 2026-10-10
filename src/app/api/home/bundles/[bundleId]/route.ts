import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission, hasOfficeAccess } from "@/features/admin/server/rbac.service";
import { getOutboundBundleDetails } from "@/features/home/server/bundle-workflow.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bundleId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.ownerAdminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(currentUser, "home.view")) {
      return NextResponse.json(
        { error: "You do not have permission to access Home module." },
        { status: 403 }
      );
    }

    if (!hasPermission(currentUser, "home.outbound.view")) {
      return NextResponse.json(
        { error: "Forbidden. You do not have permission to view Outbound Bundles." },
        { status: 403 }
      );
    }

    const { bundleId } = await params;
    if (!bundleId) {
      return NextResponse.json({ error: "Bundle ID is required." }, { status: 400 });
    }

    const bundle = await getOutboundBundleDetails({
      bundleId,
      ownerAdminId: currentUser.ownerAdminId,
    });

    if (!bundle) {
      return NextResponse.json({ error: "Bundle not found." }, { status: 404 });
    }

    const isSuperAdmin = Boolean(currentUser.isSuperAdmin || currentUser.role === "Super Admin");
    if (!isSuperAdmin) {
      const fromOfficeId = bundle.fromOfficeId;
      const fromOfficeName = bundle.fromOffice?.officeName;
      const hasAccess =
        (fromOfficeId && hasOfficeAccess(currentUser, fromOfficeId, "home")) ||
        (fromOfficeName && hasOfficeAccess(currentUser, fromOfficeName, "home"));

      if (!hasAccess) {
        return NextResponse.json(
          { error: "You do not have permission to view this bundle." },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ data: bundle });
  } catch (error: any) {
    console.error("Bundle Details API GET Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
