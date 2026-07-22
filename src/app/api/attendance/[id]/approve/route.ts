import { auth } from "@/lib/auth";
import { approveAttendance } from "@/features/attendance/server/attendance.service";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { NextRequest } from "next/server";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
    const params = await context.params;
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ message: "Authentication required." }, { status: 401 });
  }

  const canApprove =
    session.user.isSuperAdmin || hasPermission(session.user, "attendance_approval.view");

  if (!canApprove) {
    return Response.json({ message: "Access denied." }, { status: 403 });
  }

  const { id } = await params;
  const ownerAdminId = session.user.ownerAdminId ?? session.user.id;

  try {
    const record = await approveAttendance(id, ownerAdminId, session.user.name ?? session.user.email ?? "Admin");
    return Response.json({ record });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Approval failed.";
    console.error("[api/attendance/approve] Error:", err);
    return Response.json({ message }, { status: 500 });
  }
}
