import { setRolePermissions } from "@/features/admin/server/rbac.service";
import { rolePermissionSchema } from "@/features/admin/validations/rbac.schema";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const denied = await requireApiPermission("roles.manage");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const parsed = rolePermissionSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid permissions payload.");
    }

    const role = await setRolePermissions(ownerAdminId, id, parsed.data.permissionCodes);

    if (!role) {
      return jsonError("Role not found.", 404);
    }

    return jsonOk({ role });
  } catch (error) {
    console.error("Failed to update role permissions", error);
    return jsonError("Unable to update role permissions.", 500);
  }
}
