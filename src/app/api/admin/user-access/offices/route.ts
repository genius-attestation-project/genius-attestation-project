import { NextRequest } from "next/server";

import { setUserOfficeVisibility } from "@/features/admin/server/user-access.service";
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
    const userId = body?.userId;
    const officeLocationIds = Array.isArray(body?.officeLocationIds)
      ? body.officeLocationIds.filter((id: any) => typeof id === "string" && id.trim())
      : [];

    if (!userId || typeof userId !== "string") {
      return jsonError("Target user ID is required.", 400);
    }

    const result = await setUserOfficeVisibility(ownerAdminId, userId, officeLocationIds);
    return jsonOk(result);
  } catch (error) {
    console.error("[POST /api/admin/user-access/offices] Save office visibility error:", error);
    return jsonError(error instanceof Error ? error.message : "Unable to save office visibility.", 500);
  }
}
