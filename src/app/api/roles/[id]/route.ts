import { deleteRole, updateRole } from "@/features/admin/server/rbac.service";
import { roleSchema } from "@/features/admin/validations/rbac.schema";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const denied = await requireApiPermission("roles.edit");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const parsed = roleSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid role payload.");
    }

    const role = await updateRole(ownerAdminId, id, parsed.data);

    if (!role) {
      return jsonError("Role not found.", 404);
    }

    return jsonOk({ role });
  } catch (error) {
    console.error("Failed to update role", error);
    return jsonError("Unable to update role.", 500);
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const denied = await requireApiPermission("roles.delete");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { id } = await context.params;
    const deleted = await deleteRole(ownerAdminId, id);

    if (!deleted) {
      return jsonError("Role not found.", 404);
    }

    return jsonOk({ success: true });
  } catch (error) {
    console.error("Failed to delete role", error);
    return jsonError("Unable to delete role.", 500);
  }
}

