import { getLobSummary } from "@/features/lead/server/lead.service";
import { hasOfficeAccess } from "@/features/admin/server/rbac.service";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const denied = await requireApiPermission("lob.view");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { searchParams } = new URL(request.url);
    const officeLocationId = searchParams.get("officeLocationId") ?? undefined;

    if (officeLocationId && !hasOfficeAccess(session?.user, officeLocationId, "lead_management")) {
      return jsonError("Access denied for the requested office.", 403);
    }

    const data = await getLobSummary(ownerAdminId, officeLocationId, session?.user);
    return jsonOk(data);
  } catch (error) {
    console.error("Failed to fetch LOB summary", error);
    return jsonError("Unable to fetch line-of-business data.", 500);
  }
}
