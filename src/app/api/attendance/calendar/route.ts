import { auth } from "@/lib/auth";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { getAttendanceCalendar } from "@/features/attendance/server/attendance.service";

function parseOptionalInt(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ success: false, message: "Authentication required." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = parseOptionalInt(searchParams.get("month"));
    const year = parseOptionalInt(searchParams.get("year"));
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;

    if ((!month || !year) && (!from || !to)) {
      return Response.json({ success: false, message: "month and year, or from and to, are required." }, { status: 400 });
    }

    const ownerAdminId = session.user.ownerAdminId ?? session.user.id;
    const canViewAll = session.user.isSuperAdmin || hasPermission(session.user, "attendance_approval.view");

    console.log("[api/attendance/calendar] request", {
      userId: session.user.id,
      month,
      year,
      from,
      to,
      selectedUserId: searchParams.get("userId") ?? null,
      departmentId: searchParams.get("departmentId") ?? null,
      officeLocationId: searchParams.get("officeLocationId") ?? null,
    });

    const data = await getAttendanceCalendar({
      currentUserId: session.user.id,
      ownerAdminId,
      isSuperAdmin: session.user.isSuperAdmin,
      canViewAll,
      month,
      year,
      from,
      to,
      userId: searchParams.get("userId") ?? undefined,
      departmentId: searchParams.get("departmentId") ?? undefined,
      officeLocationId: searchParams.get("officeLocationId") ?? undefined,
    });

    return Response.json({ success: true, ...data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load attendance calendar.";
    console.error("[api/attendance/calendar] Error:", err);
    return Response.json({ success: false, message }, { status: 500 });
  }
}
