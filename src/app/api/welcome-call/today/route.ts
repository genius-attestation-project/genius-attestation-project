import { auth } from "@/lib/auth";
import { resolveOfficeLocationName } from "@/lib/office-location";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { listWelcomeCalls } from "@/features/welcome-call/server/welcome-call.service";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET() {
  const denied = await requireApiPermission("welcome_call.view");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const officeLocationName = await resolveOfficeLocationName({
      ownerAdminId,
      officeLocationId: session.user?.officeLocationId,
      officeLocationName: session.user?.officeLocationName,
    });

    if (!officeLocationName) {
      return jsonError("Office location is required for welcome call access.", 400);
    }

    const data = await listWelcomeCalls(ownerAdminId, officeLocationName, { scope: "today" });
    return jsonOk(data);
  } catch (error) {
    console.error("Failed to fetch welcome call queue for today", error);
    return jsonError("Unable to fetch today's welcome call queue.", 500);
  }
}
