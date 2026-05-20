import { Prisma } from "@prisma/client";

import { deleteDepartment, updateDepartment } from "@/features/admin/server/rbac.service";
import { departmentSchema } from "@/features/admin/validations/rbac.schema";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const denied = await requireApiPermission("departments.edit");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const parsed = departmentSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid department payload.");
    }

    const department = await updateDepartment(ownerAdminId, id, parsed.data);

    if (!department) {
      return jsonError("Department not found.", 404);
    }

    return jsonOk({ department });
  } catch (error) {
    if (error instanceof Error && error.message === "A department with this name already exists.") {
      return jsonError(error.message, 409);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("A department with this name already exists.", 409);
    }

    console.error("Failed to update department", error);
    return jsonError("Unable to update department.", 500);
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const denied = await requireApiPermission("departments.delete");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { id } = await context.params;
    const deleted = await deleteDepartment(ownerAdminId, id);

    if (!deleted) {
      return jsonError("Department not found.", 404);
    }

    return jsonOk({ success: true });
  } catch (error) {
    console.error("Failed to delete department", error);
    return jsonError("Unable to delete department.", 500);
  }
}
