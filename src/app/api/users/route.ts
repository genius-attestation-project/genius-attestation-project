import { createUser, listRoleOptions, listUsers } from "@/features/admin/server/rbac.service";
import { userSchema } from "@/features/admin/validations/rbac.schema";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET() {
  const denied = await requireApiPermission("users.view");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const [users, roles] = await Promise.all([
      listUsers(ownerAdminId),
      listRoleOptions(ownerAdminId)
    ]);
    return jsonOk({ users, roles });
  } catch (error) {
    console.error("Failed to fetch users", error);
    return jsonError("Unable to fetch users.", 500);
  }
}

export async function POST(request: Request) {
  const denied = await requireApiPermission("users.create");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const body = await request.json().catch(() => null);
    const parsed = userSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid user payload.");
    }

    const user = await createUser(ownerAdminId, parsed.data);
    return jsonOk({ user }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "A user with this email already exists.") {
      return jsonError(error.message, 409);
    }

    if (error instanceof Error && error.message === "Password is required.") {
      return jsonError(error.message, 400);
    }

    if (
      error instanceof Error &&
      (
        error.message === "Department not found." ||
        error.message === "Office location not found." ||
        error.message === "Supervisor not found."
      )
    ) {
      return jsonError(error.message, 400);
    }

    console.error("Failed to create user", error);
    return jsonError("Unable to create user.", 500);
  }
}
