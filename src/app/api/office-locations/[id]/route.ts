import { Prisma } from "@prisma/client";

import {
  deleteOfficeLocation,
  updateOfficeLocation,
} from "@/features/admin/server/rbac.service";
import { officeLocationSchema } from "@/features/admin/validations/rbac.schema";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const denied = await requireApiPermission("office_locations.edit");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const parsed = officeLocationSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid office location payload.");
    }

    const officeLocation = await updateOfficeLocation(ownerAdminId, id, parsed.data);

    if (!officeLocation) {
      return jsonError("Office location not found.", 404);
    }

    return jsonOk({ officeLocation });
  } catch (error) {
    if (error instanceof Error && error.message === "An office location with this name already exists.") {
      return jsonError(error.message, 409);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("An office location with this name already exists.", 409);
    }

    console.error("Failed to update office location", error);
    return jsonError("Unable to update office location.", 500);
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const denied = await requireApiPermission("office_locations.delete");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { id } = await context.params;
    const deleted = await deleteOfficeLocation(ownerAdminId, id);

    if (!deleted) {
      return jsonError("Office location not found.", 404);
    }

    return jsonOk({ success: true });
  } catch (error) {
    console.error("Failed to delete office location", error);
    return jsonError("Unable to delete office location.", 500);
  }
}
