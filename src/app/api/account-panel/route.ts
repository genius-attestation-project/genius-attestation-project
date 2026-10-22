import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";
import { getAssignedAccountTree } from "@/features/account-menu/server/account-menu.service";
import { resolveOfficeLocationId, resolveOfficeLocationName } from "@/lib/office-location";
import { hasOfficeAccess } from "@/features/admin/server/rbac.service";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const authError = await requireApiPermission("account_panel.view");
  if (authError) return authError;

  const session = await auth();

  try {
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const isSuperAdmin = Boolean(
      session?.user?.isSuperAdmin || session?.user?.role === "Super Admin"
    );

    const { searchParams } = new URL(request.url);
    const queryOfficeId = searchParams.get("officeId") || undefined;
    const queryOfficeName = searchParams.get("officeName") || undefined;

    // Resolve target office ID
    let targetOfficeId: string | null = null;
    let targetOfficeName: string | null = null;

    if (queryOfficeId) {
      const office = await prisma.officeLocation.findFirst({
        where: { id: queryOfficeId, ownerAdminId },
        select: { id: true, officeName: true },
      });
      if (office) {
        targetOfficeId = office.id;
        targetOfficeName = office.officeName;
      }
    } else if (queryOfficeName) {
      const office = await prisma.officeLocation.findFirst({
        where: { officeName: queryOfficeName, ownerAdminId },
        select: { id: true, officeName: true },
      });
      if (office) {
        targetOfficeId = office.id;
        targetOfficeName = office.officeName;
      }
    }

    // Verify authorization if a specific office was requested by non-superadmin
    if (targetOfficeId && !isSuperAdmin) {
      const isAllowed =
        hasOfficeAccess(session?.user, targetOfficeId, "account_panel") ||
        hasOfficeAccess(session?.user, targetOfficeName, "account_panel");
      if (!isAllowed) {
        // Fall back to the user's assigned office
        targetOfficeId = null;
        targetOfficeName = null;
      }
    }

    if (!targetOfficeId) {
      targetOfficeId = await resolveOfficeLocationId({
        ownerAdminId,
        userId: session?.user?.id,
        officeLocationId: session?.user?.officeLocationId,
        officeLocationName: session?.user?.officeLocationName,
      });

      if (targetOfficeId) {
        targetOfficeName = await resolveOfficeLocationName({
          ownerAdminId,
          officeLocationId: targetOfficeId,
        });
      }
    }

    // Fetch server-side filtered account tree for resolved office
    const tree = targetOfficeId
      ? await getAssignedAccountTree(ownerAdminId, targetOfficeId)
      : [];

    // Fetch available offices list for office selector
    const availableOffices = await prisma.officeLocation.findMany({
      where: { ownerAdminId },
      select: {
        id: true,
        officeName: true,
        location: true,
      },
      orderBy: [{ location: "asc" }, { officeName: "asc" }],
    });

    const authorizedOffices = isSuperAdmin
      ? availableOffices
      : availableOffices.filter(
          (o) =>
            hasOfficeAccess(session?.user, o.id, "account_panel") ||
            hasOfficeAccess(session?.user, o.officeName, "account_panel")
        );

    return jsonOk({
      tree,
      activeOffice: targetOfficeId
        ? { id: targetOfficeId, name: targetOfficeName || "Current Office" }
        : null,
      availableOffices: authorizedOffices.map((o) => ({
        id: o.id,
        name: o.officeName,
        country: o.location || "Other",
      })),
      isSuperAdmin,
    });
  } catch (error: any) {
    console.error("Failed to fetch Account Panel data:", error);
    return jsonError(error.message || "Unable to load Account Panel.", 500);
  }
}
