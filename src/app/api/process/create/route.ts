import { createProcessAssignment } from "@/features/process/server/process.service";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";

export async function POST(request: Request) {
  const denied = await requireApiPermission("process.create"); // or bm_report.view if sending from BM Report
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    const userId = session?.user?.id;

    if (!ownerAdminId || !userId) {
      return jsonError("Unauthorized", 401);
    }

    const body = await request.json();
    const { registrationId, trackingNumber, processType, remarks } = body;

    if (!registrationId || !trackingNumber || !processType) {
      return jsonError("Missing required fields", 400);
    }

    const assignment = await createProcessAssignment({
      registrationId,
      trackingNumber,
      processType,
      userId,
      ownerAdminId,
      remarks,
    });

    return jsonOk({ success: true, data: assignment });
  } catch (error) {
    console.error("Failed to create process assignment", error);
    return jsonError(error instanceof Error ? error.message : "Unable to assign process", 500);
  }
}
