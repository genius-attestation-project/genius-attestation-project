import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { listEditRequests } from "@/features/registration/server/registration-edit-request.service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId || !session?.user) return jsonError("Unauthorized", 401);

    const canView =
      hasPermission(session.user, "edit_request.view") ||
      hasPermission(session.user, "pending_approval.view");

    if (!canView) {
      return jsonError("You do not have permission to view edit requests.", 403);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;
    const trackingNumber = searchParams.get("trackingNumber") ?? undefined;
    const registrationId = searchParams.get("registrationId") ?? undefined;
    const office = searchParams.get("office") ?? undefined;
    const page = searchParams.get("page") ? Number(searchParams.get("page")) : 1;
    const pageSize = searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : 50;

    const data = await listEditRequests(ownerAdminId, {
      status,
      trackingNumber,
      registrationId,
      office,
      page,
      pageSize,
    });

    return jsonOk(data);
  } catch (error) {
    console.error("Failed to list registration edit requests", error);
    return jsonError("Unable to fetch edit requests.", 500);
  }
}
