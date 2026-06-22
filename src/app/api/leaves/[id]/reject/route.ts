import { auth } from "@/lib/auth";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { rejectLeaveRequest } from "@/features/leave/server/leave.service";
import { leaveDecisionSchema } from "@/features/leave/validations/leave.schema";
import { jsonError, jsonOk } from "@/utils/response";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Authentication required.", 401);
    if (!session.user.isSuperAdmin && !hasPermission(session.user, "leave.approve")) {
      return jsonError("You do not have permission to reject leave.", 403);
    }

    const body = await request.json().catch(() => null);
    const parsed = leaveDecisionSchema.safeParse(body);
    if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid rejection payload.");

    const { id } = await params;
    const ownerAdminId = session.user.ownerAdminId ?? session.user.id;
    const row = await rejectLeaveRequest({
      leaveId: id,
      ownerAdminId,
      rejectedBy: session.user.id,
      note: parsed.data.note,
    });

    return jsonOk({ row });
  } catch (error) {
    console.error("[api/leaves/:id/reject] failed", error);
    return jsonError(error instanceof Error ? error.message : "Unable to reject leave.", 500);
  }
}
