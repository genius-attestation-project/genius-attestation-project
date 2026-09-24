import { listPendingLeads } from "@/features/lead/server/lead.service";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET() {
  const denied = await requireApiPermission("pending_approval.view");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const data = await listPendingLeads(ownerAdminId);
    return jsonOk(data);
  } catch (error) {
    console.error("Failed to fetch pending leads", error);
    return jsonError("Unable to fetch pending leads.", 500);
  }
}

