import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";
import { getAssignedAccountTree } from "@/features/account-menu/server/account-menu.service";
import { resolveOfficeLocationId, resolveOfficeLocationName } from "@/lib/office-location";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  // Allow access if user has account_panel.view permission OR account_menu.view or is authenticated
  const authError = await requireApiPermission("account_panel.view");
  const session = await auth();

  if (authError && !session?.user) {
    return authError;
  }

  try {
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

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

    return jsonOk({
      tree,
      activeOffice: targetOfficeId
        ? { id: targetOfficeId, name: targetOfficeName || "Current Office" }
        : null,
      availableOffices: availableOffices.map((o) => ({
        id: o.id,
        name: o.officeName,
        country: o.location || "Other",
      })),
      isSuperAdmin: Boolean(session?.user?.isSuperAdmin || session?.user?.role === "Super Admin"),
    });
  } catch (error: any) {
    console.error("Failed to fetch Account Panel data:", error);
    return jsonError(error.message || "Unable to load Account Panel.", 500);
  }
}
