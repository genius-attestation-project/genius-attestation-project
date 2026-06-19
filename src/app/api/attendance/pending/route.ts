import { auth } from "@/lib/auth";
import { listPendingApprovals } from "@/features/attendance/server/attendance.service";
import { hasPermission } from "@/features/admin/server/rbac.service";

export async function GET() {
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
}
