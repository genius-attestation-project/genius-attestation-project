import { moveProcessAssignment } from "@/features/process/server/process.service";
import { auth } from "@/lib/auth";
import { resolveOfficeLocationName } from "@/lib/office-location";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";
import { moveProcessSchema } from "@/features/process/types/process.types";

export async function POST(request: Request) {
  const denied = await requireApiPermission("process.move");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    const userId = session?.user?.id;

    if (!ownerAdminId || !userId) {
      return jsonError("Unauthorized", 401);
    }

    const body = await request.json();
    const parsed = moveProcessSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Invalid input", 400);
    }

    const { assignmentId, action, targetOfficeId, remarks } = parsed.data;

    const officeLocationName = await resolveOfficeLocationName({
      ownerAdminId,
      officeLocationId: session?.user?.officeLocationId,
      officeLocationName: session?.user?.officeLocationName,
    });
    
    if (!officeLocationName) {
      return jsonError("Office location required", 400);
    }

    const updated = await moveProcessAssignment({
      assignmentId,
      action,
      targetOfficeId,
      userId,
      ownerAdminId,
      remarks,
      officeLocationName,
    });

    return jsonOk({ success: true, data: updated });
  } catch (error) {
    console.error("Failed to move process", error);
    return jsonError(error instanceof Error ? error.message : "Unable to move process", 500);
  }
}
