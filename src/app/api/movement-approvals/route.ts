import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { listPendingMovementApprovals } from "@/features/document-movement/server/movement-approval.service";
import { resolveOfficeLocationId, resolveOfficeLocationName } from "@/lib/office-location";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const url = new URL(request.url);
    const queryOfficeId = url.searchParams.get("officeId") || url.searchParams.get("officeLocationId");
    const queryOfficeName = url.searchParams.get("office") || url.searchParams.get("officeName");

    const userOfficeName = await resolveOfficeLocationName({
      ownerAdminId,
      userId: session?.user?.id,
      officeLocationId: queryOfficeId || (session?.user as any)?.officeLocationId,
      officeLocationName: queryOfficeName || (session?.user as any)?.officeLocationName,
    });

    const userOfficeId = await resolveOfficeLocationId({
      ownerAdminId,
      userId: session?.user?.id,
      officeLocationId: queryOfficeId || (session?.user as any)?.officeLocationId,
      officeLocationName: queryOfficeName || (session?.user as any)?.officeLocationName,
    });

    const items = await listPendingMovementApprovals({
      ownerAdminId,
      officeId: userOfficeId || undefined,
      officeName: userOfficeName || undefined,
    });
    return jsonOk({ items });
  } catch (error: any) {
    console.error("Failed to list pending movement approvals:", error);
    return jsonError(error.message || "Failed to list movement approvals.", 500);
  }
}
