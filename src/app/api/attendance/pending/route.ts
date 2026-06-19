import { auth } from "@/lib/auth";
import { listPendingApprovals } from "@/features/attendance/server/attendance.service";
import { hasPermission } from "@/features/admin/server/rbac.service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ message: "Authentication required." }, { status: 401 });
    }

    const canApprove =
      session.user.isSuperAdmin || hasPermission(session.user, "attendance_approval.view");

    if (!canApprove) {
      return Response.json({ message: "Access denied." }, { status: 403 });
    }

    const ownerAdminId = session.user.ownerAdminId ?? session.user.id;
    const records = await listPendingApprovals(ownerAdminId);
    return Response.json({ records });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load pending approvals.";
    console.error("[api/attendance/pending] Error:", err);
    return Response.json({ message }, { status: 500 });
  }
}
