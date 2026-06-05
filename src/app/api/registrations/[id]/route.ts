import { Prisma } from "@prisma/client";

import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";
import {
  deleteRegistration,
  getRegistrationById,
  updateRegistration,
} from "@/features/registration/server/registration.service";
import { registrationInputSchema } from "@/features/registration/validations/registration.schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { id } = await context.params;
    const registration = await getRegistrationById(ownerAdminId, id);

    if (!registration) return jsonError("Registration not found.", 404);

    return jsonOk({ registration });
  } catch (error) {
    console.error("Failed to fetch registration", error);
    return jsonError("Unable to fetch registration.", 500);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const parsed = registrationInputSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid registration payload.");
    }

    const sourceOfficeName = session.user?.officeLocationName?.trim();
    if (!sourceOfficeName) {
      return jsonError("Assign an office location to the current user before updating registrations.", 400);
    }

    const performedBy = session.user?.name ?? session.user?.email ?? undefined;
    const registration = await updateRegistration(ownerAdminId, id, parsed.data, sourceOfficeName, performedBy);

    if (!registration) return jsonError("Registration not found.", 404);

    return jsonOk({ registration });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("Tracking number already exists.", 409);
    }

    console.error("Failed to update registration", error);
    return jsonError("Unable to update registration.", 500);
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { id } = await context.params;
    const performedBy = session.user?.name ?? session.user?.email ?? undefined;
    const deleted = await deleteRegistration(ownerAdminId, id, performedBy);

    if (!deleted) return jsonError("Registration not found.", 404);

    return jsonOk({ success: true });
  } catch (error) {
    console.error("Failed to delete registration", error);
    return jsonError("Unable to delete registration.", 500);
  }
}
