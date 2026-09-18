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
      session.user.isSuperAdmin ||
      hasPermission(session.user, "edit_request.view") ||
      hasPermission(session.user, "edit_request.approve") ||
      hasPermission(session.user, "edit_request.reject");

    if (!canView) {
      return jsonError("You do not have permission to view edit requests.", 403);
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const status = statusParam !== null ? (statusParam || "PENDING") : "PENDING";
    const trackingNumber = searchParams.get("trackingNumber") ?? undefined;
    const registrationId = searchParams.get("registrationId") ?? undefined;
    const office = searchParams.get("office") ?? undefined;
    const page = searchParams.get("page") ? Number(searchParams.get("page")) : 1;
    const pageSize = searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : 50;

    let allowedOfficeNames = session.user.allowedOfficeNames;

    if (!session.user.isSuperAdmin && session.user.moduleOfficeVisibilities?.["pending_approval"]) {
      const modConfig = session.user.moduleOfficeVisibilities["pending_approval"];
      allowedOfficeNames = modConfig.officeNames;
    }

    const data = await listEditRequests(ownerAdminId, {
      status,
      trackingNumber,
      registrationId,
      office,
      page,
      pageSize,
      allowedOfficeNames,
      isSuperAdmin: session.user.isSuperAdmin,
    });

    return jsonOk(data);
  } catch (error) {
    console.error("Failed to list registration edit requests", error);
    return jsonError("Unable to fetch edit requests.", 500);
  }
}
