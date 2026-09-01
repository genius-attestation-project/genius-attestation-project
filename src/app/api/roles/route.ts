import { createRole, listRoles } from "@/features/admin/server/rbac.service";
import { roleSchema } from "@/features/admin/validations/rbac.schema";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";
import { NextRequest } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;

    if (!ownerAdminId || !session?.user) {
      return jsonError("Authentication required.", 401);
    }

    if (!session.user.isSuperAdmin) {
      return jsonError("Super Admin access required to manage roles.", 403);
    }

    const roles = await listRoles(ownerAdminId);
    return jsonOk({ roles });
  } catch (error: any) {
    console.error("[GET /api/roles] Error:", error);
    return jsonError("Unable to fetch roles.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;

    if (!ownerAdminId || !session?.user) {
      return jsonError("Authentication required.", 401);
    }

    if (!session.user.isSuperAdmin) {
      return jsonError("Super Admin access required to create roles.", 403);
    }

    const body = await request.json().catch(() => null);
    const parsed = roleSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid role payload.", 400);
    }

    const role = await createRole(ownerAdminId, parsed.data);
    return jsonOk({ role }, 201);
  } catch (error: any) {
    console.error("[POST /api/roles] Error:", error);
    return jsonError("Unable to create role.", 500);
  }
}
