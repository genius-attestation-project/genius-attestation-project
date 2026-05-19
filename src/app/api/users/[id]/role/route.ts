import { setUserRole } from "@/features/admin/server/rbac.service";
import { userRoleSchema } from "@/features/admin/validations/rbac.schema";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const denied = await requireApiPermission("users.manage");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const parsed = userRoleSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid role assignment payload.");
    }

    const user = await setUserRole(ownerAdminId, id, parsed.data.roleId);

    if (!user) {
      return jsonError("User or role not found.", 404);
    }

    return jsonOk({ user });
  } catch (error) {
    console.error("Failed to assign role", error);
    return jsonError("Unable to assign role.", 500);
  }
}

