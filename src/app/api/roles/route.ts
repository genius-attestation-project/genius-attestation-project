import { createRole, listRoles } from "@/features/admin/server/rbac.service";
import { roleSchema } from "@/features/admin/validations/rbac.schema";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET() {
  const denied = await requireApiPermission("roles.view");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const roles = await listRoles(ownerAdminId);
    return jsonOk({ roles });
  } catch (error) {
    console.error("Failed to fetch roles", error);
    return jsonError("Unable to fetch roles.", 500);
  }
}

export async function POST(request: Request) {
  const denied = await requireApiPermission("roles.create");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const body = await request.json().catch(() => null);
    const parsed = roleSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid role payload.");
    }

    const role = await createRole(ownerAdminId, parsed.data);
    return jsonOk({ role }, 201);
  } catch (error) {
    console.error("Failed to create role", error);
    return jsonError("Unable to create role.", 500);
  }
}

