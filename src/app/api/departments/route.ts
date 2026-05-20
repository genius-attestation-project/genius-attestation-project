import { Prisma } from "@prisma/client";

import { createDepartment, listDepartments } from "@/features/admin/server/rbac.service";
import { departmentSchema } from "@/features/admin/validations/rbac.schema";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET() {
  const denied = await requireApiPermission("departments.view");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const departments = await listDepartments(ownerAdminId);
    return jsonOk({ departments });
  } catch (error) {
    console.error("Failed to fetch departments", error);
    return jsonError("Unable to fetch departments.", 500);
  }
}

export async function POST(request: Request) {
  const denied = await requireApiPermission("departments.create");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const body = await request.json().catch(() => null);
    const parsed = departmentSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid department payload.");
    }

    const department = await createDepartment(ownerAdminId, parsed.data);
    return jsonOk({ department }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "A department with this name already exists.") {
      return jsonError(error.message, 409);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("A department with this name already exists.", 409);
    }

    console.error("Failed to create department", error);
    return jsonError("Unable to create department.", 500);
  }
}
