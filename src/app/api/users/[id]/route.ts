import { deleteUser, updateUser } from "@/features/admin/server/rbac.service";
import { userSchema } from "@/features/admin/validations/rbac.schema";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const denied = await requireApiPermission("users.edit");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const parsed = userSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid user payload.");
    }

    const user = await updateUser(ownerAdminId, id, parsed.data);

    if (!user) {
      return jsonError("User not found.", 404);
    }

    return jsonOk({ user });
  } catch (error) {
    if (error instanceof Error && error.message === "A user with this email already exists.") {
      return jsonError(error.message, 409);
    }

    if (
      error instanceof Error &&
      (error.message === "Department not found." || error.message === "Office location not found.")
    ) {
      return jsonError(error.message, 400);
    }

    console.error("Failed to update user", error);
    return jsonError("Unable to update user.", 500);
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const denied = await requireApiPermission("users.delete");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { id } = await context.params;
    const deleted = await deleteUser(ownerAdminId, id);

    if (!deleted) {
      return jsonError("User not found.", 404);
    }

    return jsonOk({ success: true });
  } catch (error) {
    console.error("Failed to delete user", error);
    return jsonError("Unable to delete user.", 500);
  }
}

