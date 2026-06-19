import { auth } from "@/lib/auth";
import { listAttendanceRecords } from "@/features/attendance/server/attendance.service";
import { hasPermission } from "@/features/admin/server/rbac.service";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ message: "Authentication required." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "20");
  const filterUserId = searchParams.get("userId") ?? undefined;

  const ownerAdminId = session.user.ownerAdminId ?? session.user.id;
  const canApprove = hasPermission(session.user, "attendance_approval.view");

  const result = await listAttendanceRecords({
    userId: session.user.id,
    ownerAdminId,
    isSuperAdmin: session.user.isSuperAdmin,
    canApprove,
    page,
    limit,
    filterUserId,
  });

  return Response.json(result);
}
