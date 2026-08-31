import { NextRequest } from "next/server";

import { listUserAccessData } from "@/features/admin/server/user-access.service";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET(request: NextRequest) {
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

    const data = await listUserAccessData(ownerAdminId);
    return jsonOk(data);
  } catch (error) {
    console.error("[GET /api/admin/user-access] Failed to fetch access data", error);
    return jsonError(error instanceof Error ? error.message : "Unable to fetch user access data.", 500);
  }
}
