import { listPermissions } from "@/features/admin/server/rbac.service";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET() {
  const denied = await requireApiPermission("roles.view");

  if (denied) {
    return denied;
  }

  try {
    const permissions = await listPermissions();
    return jsonOk({ permissions });
  } catch (error) {
    console.error("Failed to fetch permissions", error);
    return jsonError("Unable to fetch permissions.", 500);
  }
}
