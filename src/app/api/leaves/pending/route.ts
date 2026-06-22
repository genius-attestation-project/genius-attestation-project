import { auth } from "@/lib/auth";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { listPendingLeaveRequests } from "@/features/leave/server/leave.service";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Authentication required.", 401);
    if (!session.user.isSuperAdmin && !hasPermission(session.user, "leave.approve")) {
      return jsonError("You do not have permission to review leave requests.", 403);
    }

    const ownerAdminId = session.user.ownerAdminId ?? session.user.id;
    const rows = await listPendingLeaveRequests(ownerAdminId);
    return jsonOk({ rows });
  } catch (error) {
    console.error("[api/leaves/pending] failed", error);
    return jsonError(error instanceof Error ? error.message : "Unable to fetch pending leave requests.", 500);
  }
}
