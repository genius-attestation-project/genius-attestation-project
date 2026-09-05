import { Prisma } from "@prisma/client";

import { auth } from "@/lib/auth";
import { resolveOfficeLocationName } from "@/lib/office-location";
import { jsonError, jsonOk } from "@/utils/response";
import { hasPermission } from "@/features/admin/server/rbac.service";
import {
  deleteRegistration,
  getRegistrationById,
} from "@/features/registration/server/registration.service";
import { createEditRequest } from "@/features/registration/server/registration-edit-request.service";
import { registrationInputSchema } from "@/features/registration/validations/registration.schema";
import { NextRequest } from "next/server";

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId || !session?.user) return jsonError("Unauthorized", 401);

    if (!hasPermission(session.user, "revenue_registration.view")) {
      return jsonError("You do not have permission to view this registration.", 403);
    }

    const { id } = await context.params;
    const registration = await getRegistrationById(ownerAdminId, id);

    if (!registration) return jsonError("Registration not found.", 404);

    return jsonOk({ registration });
  } catch (error) {
    console.error("Failed to fetch registration", error);
    return jsonError("Unable to fetch registration.", 500);
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const body = await request.json().catch(() => null);

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId || !session?.user) return jsonError("Unauthorized", 401);

    const canEdit =
      hasPermission(session.user, "revenue_registration.edit") ||
      hasPermission(session.user, "revenue_registration.create_request") ||
      hasPermission(session.user, "edit.create_request");

    if (!canEdit) {
      return jsonError("You do not have permission to edit revenue registrations.", 403);
    }

    const { id } = await context.params;
    const parsed = registrationInputSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid registration payload.");
    }

    const sourceOfficeName = await resolveOfficeLocationName({
      ownerAdminId,
      officeLocationId: session.user?.officeLocationId,
      officeLocationName: session.user?.officeLocationName,
    });
    if (!sourceOfficeName) {
      return jsonError("Assign a valid office location to the current user before updating registrations.", 400);
    }

    const requestedByName = session.user?.name ?? session.user?.email ?? "User";
    const editRequest = await createEditRequest({
      ownerAdminId,
      registrationId: id,
      input: parsed.data,
      sourceOfficeName,
      requestedById: session.user.id,
      requestedByName,
    });

    return jsonOk({
      message: "Edit approval request created successfully. Document changes will apply upon approval.",
      editRequest,
      registration: { id },
      isEditRequest: true,
    });
  } catch (error: any) {
    if (error?.statusCode) {
      return jsonError(error.message, error.statusCode);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("Tracking number already exists.", 409);
    }

    const message = error instanceof Error ? error.message : "Unable to submit edit request.";
    console.error("Failed to submit edit request", {
      error,
      payload: body,
    });
    return jsonError(message, 500);
  }
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId || !session?.user) return jsonError("Unauthorized", 401);

    if (!hasPermission(session.user, "revenue_registration.delete")) {
      return jsonError("You do not have permission to delete revenue registrations.", 403);
    }

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
