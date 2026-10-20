import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";

import { hasPermission } from "@/features/admin/server/rbac.service";
import { createRegistrationBatch } from "@/features/registration/server/registration.service";
import { registrationBatchInputSchema } from "@/features/registration/validations/registration.schema";
import { auth } from "@/lib/auth";
import { resolveOfficeLocationName } from "@/lib/office-location";
import { jsonError, jsonOk } from "@/utils/response";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId || !session?.user) {
      return jsonError("No owner admin ID found.", 401);
    }

    if (!hasPermission(session.user, "revenue_registration.create")) {
      return jsonError("You do not have permission to create revenue registrations.", 403);
    }

    const parsed = registrationBatchInputSchema.safeParse(body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const fieldPath = firstIssue?.path.join(".");
      console.error("[POST /api/registrations/batch] Validation error:", {
        issues: parsed.error.issues,
        receivedBody: body,
      });
      const errorMsg = fieldPath
        ? `${fieldPath}: ${firstIssue.message}`
        : firstIssue?.message ?? "Invalid batch registration payload.";
      return jsonError(errorMsg, 400);
    }

    const sourceOfficeName = await resolveOfficeLocationName({
      ownerAdminId,
      officeLocationId: session.user?.officeLocationId,
      officeLocationName: session.user?.officeLocationName,
      userId: session.user?.id,
    });

    if (!sourceOfficeName) {
      return jsonError(
        "Assign a valid office location to the current user before creating registrations.",
        400,
      );
    }

    const performedBy = session.user?.name ?? session.user?.email ?? undefined;
    const userId = session.user?.id;

    const result = await createRegistrationBatch({
      ownerAdminId,
      leadId: parsed.data.leadId,
      documents: parsed.data.documents,
      sourceOfficeName,
      performedBy,
      userId,
      user: session.user,
    });

    return jsonOk(result, 201);
  } catch (error: any) {
    if (error?.statusCode) {
      return jsonError(error.message, error.statusCode);
    }

    if ((error as any)?.code === "P2002") {
      return jsonError("A document with this tracking number already exists.", 409);
    }

    const message = error instanceof Error ? error.message : "Unable to create registration batch.";
    console.error("[POST /api/registrations/batch] Error:", {
      error,
      payload: body,
    });
    return jsonError(message, 500);
  }
}
