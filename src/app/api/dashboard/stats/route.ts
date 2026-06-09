import { getDashboardStats } from "@/features/lead/server/lead.service";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET() {
  const denied = await requireApiPermission("dashboard.view");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const stats = await getDashboardStats(ownerAdminId);
    return jsonOk(stats);
  } catch (error) {
    console.error("Failed to load dashboard stats", error);
    return jsonError("Unable to load dashboard statistics.", 500);
  }
}

