import { NextRequest } from "next/server";

import { setUserOfficeVisibility } from "@/features/admin/server/user-access.service";
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
      hasPermission(session.user, "access_management.manage_offices") ||
      hasPermission(session.user, "roles.edit");

    if (!canManage) {
      return jsonError("Forbidden. You do not have permission to modify office visibility.", 403);
    }

    const body = await request.json().catch(() => null);
    const userId = body?.userId;
    const rawModule = body?.moduleKey ?? body?.moduleId;
    const moduleKey = typeof rawModule === "string" && rawModule.trim() ? rawModule.trim() : undefined;

    const rawOfficeIds = body?.officeLocationIds ?? body?.officeIds;
    const officeLocationIds = Array.isArray(rawOfficeIds)
      ? rawOfficeIds.filter((id: any) => typeof id === "string" && id.trim())
      : undefined;

    const moduleOfficeMap = body?.moduleOfficeMap && typeof body.moduleOfficeMap === "object"
      ? (body.moduleOfficeMap as Record<string, string[]>)
      : undefined;

    if (!userId || typeof userId !== "string") {
      return jsonError("Target user ID is required.", 400);
    }

    if (!session.user.isSuperAdmin && userId === session.user.id) {
      return jsonError("Forbidden. You cannot modify your own office visibility.", 403);
    }

    if (!moduleKey && !moduleOfficeMap && !officeLocationIds) {
      return jsonError("Either moduleKey/moduleId with officeLocationIds/officeIds or moduleOfficeMap is required.", 400);
    }

    const result = await setUserOfficeVisibility(ownerAdminId, userId, {
      moduleKey,
      officeLocationIds,
      moduleOfficeMap,
      createdBy: session.user.id,
    });

    return jsonOk(result);
  } catch (error) {
    console.error("[POST /api/admin/user-access/offices] Save office visibility error:", error);
    return jsonError(error instanceof Error ? error.message : "Unable to save office visibility.", 500);
  }
}
