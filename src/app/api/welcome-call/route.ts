import { auth } from "@/lib/auth";
import { resolveOfficeLocationName } from "@/lib/office-location";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { listWelcomeCalls } from "@/features/welcome-call/server/welcome-call.service";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const data = await listWelcomeCalls(ownerAdminId, officeLocationName, {
      scope: searchParams.get("scope") === "all" ? "all" : "today",
      status: searchParams.get("status") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });

    return jsonOk(data);
  } catch (error) {
    console.error("Failed to fetch welcome call queue", error);
    return jsonError("Unable to fetch welcome call queue.", 500);
  }
}
