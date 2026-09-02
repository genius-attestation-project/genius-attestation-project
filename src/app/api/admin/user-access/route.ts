import { NextRequest } from "next/server";

import { listUserAccessData } from "@/features/admin/server/user-access.service";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;

    if (!ownerAdminId || !session?.user) {
      return jsonError("Authentication required.", 401);
    }

    const canAccess =
      session.user.isSuperAdmin ||
      hasPermission(session.user, "access_management.manage_offices") ||
      hasPermission(session.user, "access_management.manage_permissions") ||
      hasPermission(session.user, "roles.view") ||
      hasPermission(session.user, "admin_management.view");

    if (!canAccess) {
      return jsonError("Forbidden. You do not have permission to access user permissions management.", 403);
    }

    const data = await listUserAccessData(ownerAdminId);
    return jsonOk(data);
  } catch (error) {
    console.error("[GET /api/admin/user-access] Failed to fetch access data", error);
    return jsonError(error instanceof Error ? error.message : "Unable to fetch user access data.", 500);
  }
}
