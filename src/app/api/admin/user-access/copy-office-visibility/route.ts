import { NextRequest } from "next/server";

import { copyUserOfficeVisibility } from "@/features/admin/server/user-access.service";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;

    if (!ownerAdminId || !session?.user) {
      return jsonError("Authentication required.", 401);
    }

    if (!session?.user?.isSuperAdmin) {
      return jsonError("Super Admin access required to copy office visibility.", 403);
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

    const result = await copyUserOfficeVisibility(
      ownerAdminId,
      sourceUserId,
      targetUserId,
      session.user.id
    );

    return jsonOk(result);
  } catch (error) {
    console.error("[POST /api/admin/user-access/copy-office-visibility] Copy office visibility error:", error);
    return jsonError(error instanceof Error ? error.message : "Unable to copy office visibility.", 500);
  }
}
