import { listPendingLeadApprovals } from "@/features/lead/server/lead-approval.service";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET() {
  const denied = await requireApiPermission("pending_approval.view");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    const supervisorId = session?.user?.id;
    if (!ownerAdminId || !supervisorId) return jsonError("Authentication required.", 401);

    const items = await listPendingLeadApprovals(ownerAdminId, supervisorId);
    return jsonOk({ items });
  } catch (error) {
    console.error("Failed to fetch pending lead approvals", error);
    return jsonError("Unable to fetch pending lead approvals.", 500);
  }
}
