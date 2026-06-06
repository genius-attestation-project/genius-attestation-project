import { z } from "zod";

import { auth } from "@/lib/auth";
import { resolveOfficeLocationName } from "@/lib/office-location";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { updateWelcomeCallStatus } from "@/features/welcome-call/server/welcome-call.service";
import { welcomeCallStatuses } from "@/features/welcome-call/types/welcome-call.types";
import { jsonError, jsonOk } from "@/utils/response";

const payloadSchema = z.object({
  status: z.enum(welcomeCallStatuses),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireApiPermission("welcome_call.edit");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    const performedBy = session?.user?.name ?? session?.user?.email ?? session?.user?.id;

    if (!ownerAdminId || !performedBy) {
      return jsonError("Valid session details are required to update welcome calls.", 401);
    }

    const officeLocationName = await resolveOfficeLocationName({
      ownerAdminId,
      officeLocationId: session.user?.officeLocationId,
      officeLocationName: session.user?.officeLocationName,
    });

    if (!officeLocationName) {
      return jsonError("Office location is required for welcome call access.", 400);
    }

    const body = await request.json().catch(() => null);
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid welcome call update payload.", 400);
    }

    const { id } = await context.params;
    const item = await updateWelcomeCallStatus({
      ownerAdminId,
      officeLocationName,
      registrationId: id,
      status: parsed.data.status,
      performedBy,
    });

    if (!item) {
      return jsonError("Welcome call registration not found.", 404);
    }

    return jsonOk({ item });
  } catch (error) {
    console.error("Failed to update welcome call status", error);
    return jsonError("Unable to update welcome call status.", 500);
  }
}
