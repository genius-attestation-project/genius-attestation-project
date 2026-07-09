import { createRole, listRoles } from "@/features/admin/server/rbac.service";
import { roleSchema } from "@/features/admin/validations/rbac.schema";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET() {
  console.log("[GET /api/roles] Request initiated.");
  try {
    const session = await auth();
    console.log("[GET /api/roles] Authenticated session loaded.", { 
      userId: session?.user?.id, 
      email: session?.user?.email, 
      role: session?.user?.role 
    });

    const ownerAdminId = session?.user?.ownerAdminId;
    console.log("[GET /api/roles] ownerAdminId resolved:", ownerAdminId);

    if (!ownerAdminId) {
      console.warn("[GET /api/roles] Unauthorized: No owner admin ID found.");
      return jsonError("No owner admin ID found.", 401);
    }

    const denied = await requireApiPermission("roles.view");
    if (denied) {
      console.warn("[GET /api/roles] Forbidden: Permission 'roles.view' denied.");
      return denied;
    }

    console.log("[GET /api/roles] Calling listRoles service...");
    const roles = await listRoles(ownerAdminId);
    console.log(`[GET /api/roles] Fetched ${roles.length} roles successfully.`);

    return jsonOk({ roles });
  } catch (error: any) {
    console.error("[GET /api/roles] Unexpected error encountered:", error);
    if (error?.code) {
      console.error("[GET /api/roles] Prisma error code:", error.code);
    }
    if (error?.stack) {
      console.error("[GET /api/roles] Stack trace:", error.stack);
    }
    return jsonError("Unable to fetch roles.", 500);
  }
}

export async function POST(request: Request) {
  console.log("[POST /api/roles] Request initiated.");
  try {
    const session = await auth();
    console.log("[POST /api/roles] Authenticated session loaded.", { 
      userId: session?.user?.id, 
      email: session?.user?.email, 
    });

    const ownerAdminId = session?.user?.ownerAdminId;
    console.log("[POST /api/roles] ownerAdminId resolved:", ownerAdminId);

    if (!ownerAdminId) {
      console.warn("[POST /api/roles] Unauthorized: No owner admin ID found.");
      return jsonError("No owner admin ID found.", 401);
    }

    const denied = await requireApiPermission("roles.create");
    if (denied) {
      console.warn("[POST /api/roles] Forbidden: Permission 'roles.create' denied.");
      return denied;
    }

    const body = await request.json().catch(() => null);
    const parsed = roleSchema.safeParse(body);

    if (!parsed.success) {
      console.warn("[POST /api/roles] Bad Request: Invalid payload.", parsed.error.issues);
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid role payload.", 400);
    }

    console.log("[POST /api/roles] Calling createRole service...", parsed.data);
    const role = await createRole(ownerAdminId, parsed.data);
    console.log(`[POST /api/roles] Created role ${role.id} successfully.`);

    return jsonOk({ role }, 201);
  } catch (error: any) {
    console.error("[POST /api/roles] Unexpected error encountered:", error);
    if (error?.code) {
      console.error("[POST /api/roles] Prisma error code:", error.code);
    }
    if (error?.stack) {
      console.error("[POST /api/roles] Stack trace:", error.stack);
    }
    return jsonError("Unable to create role.", 500);
  }
}
