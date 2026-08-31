import { NextRequest } from "next/server";

import { copyUserPermissions } from "@/features/admin/server/user-access.service";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;

    if (!ownerAdminId || !session?.user) {
      return jsonError("Authentication required.", 401);
    }

    const authError = await requireApiPermission("roles.view");
    if (authError && !session.user.isSuperAdmin) {
      return authError;
    }

    const body = await request.json().catch(() => null);
    const sourceUserId = body?.sourceUserId;
    const targetUserId = body?.targetUserId;

    if (!sourceUserId || typeof sourceUserId !== "string") {
      return jsonError("Source user ID is required.", 400);
    }

    if (!targetUserId || typeof targetUserId !== "string") {
      return jsonError("Target user ID is required.", 400);
    }

    const result = await copyUserPermissions(ownerAdminId, sourceUserId, targetUserId);
    return jsonOk(result);
  } catch (error) {
    console.error("[POST /api/admin/user-access/copy-permissions] Copy permissions error:", error);
    return jsonError(error instanceof Error ? error.message : "Unable to copy user permissions.", 500);
  }
}
