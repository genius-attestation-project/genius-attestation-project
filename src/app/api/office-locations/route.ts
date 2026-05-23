import { Prisma } from "@prisma/client";

import {
  createOfficeLocation,
  listOfficeLocations,
} from "@/features/admin/server/rbac.service";
import { officeLocationSchema } from "@/features/admin/validations/rbac.schema";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET() {
  const denied = await requireApiPermission("office_locations.view");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const officeLocations = await listOfficeLocations(ownerAdminId);
    return jsonOk({ officeLocations });
  } catch (error) {
    console.error("Failed to fetch office locations", error);
    return jsonError("Unable to fetch office locations.", 500);
  }
}

export async function POST(request: Request) {
  const denied = await requireApiPermission("office_locations.create");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const body = await request.json().catch(() => null);
    const parsed = officeLocationSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid office location payload.");
    }

    const officeLocation = await createOfficeLocation(ownerAdminId, parsed.data);
    return jsonOk({ officeLocation }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "An office location with this name already exists.") {
      return jsonError(error.message, 409);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("An office location with this name already exists.", 409);
    }

    console.error("Failed to create office location", error);
    return jsonError("Unable to create office location.", 500);
  }
}
