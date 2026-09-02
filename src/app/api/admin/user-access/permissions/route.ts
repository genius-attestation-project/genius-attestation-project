import { NextRequest } from "next/server";

import { setUserPermissions } from "@/features/admin/server/user-access.service";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;

    if (!ownerAdminId || !session?.user) {
      return jsonError("Authentication required.", 401);
    }

    const canManage =
      session.user.isSuperAdmin ||
      hasPermission(session.user, "access_management.manage_permissions") ||
      hasPermission(session.user, "roles.view") ||
      hasPermission(session.user, "admin_management.view");

    if (!canManage) {
      return jsonError("Forbidden. You do not have permission to modify user permissions.", 403);
    }

    const body = await request.json().catch(() => null);
    const userId = body?.userId;
    const permissionKeys = Array.isArray(body?.permissionKeys)
      ? body.permissionKeys.filter((k: any) => typeof k === "string" && k.trim())
      : [];

    if (!userId || typeof userId !== "string") {
      return jsonError("Target user ID is required.", 400);
    }

    const result = await setUserPermissions(ownerAdminId, userId, permissionKeys);
    return jsonOk(result);
  } catch (error) {
    console.error("[POST /api/admin/user-access/permissions] Save user permissions error:", error);
    return jsonError(error instanceof Error ? error.message : "Unable to save user permissions.", 500);
  }
}
