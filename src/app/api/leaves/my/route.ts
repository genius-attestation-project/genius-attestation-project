import { auth } from "@/lib/auth";
import { listMyLeaveRequests } from "@/features/leave/server/leave.service";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Authentication required.", 401);

    const ownerAdminId = session.user.ownerAdminId ?? session.user.id;
    const rows = await listMyLeaveRequests(ownerAdminId, session.user.id);
    return jsonOk({ rows });
  } catch (error) {
    console.error("[api/leaves/my] failed", error);
    return jsonError(error instanceof Error ? error.message : "Unable to fetch leave requests.", 500);
  }
}
