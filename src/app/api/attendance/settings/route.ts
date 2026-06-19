import { auth } from "@/lib/auth";
import {
  listAttendanceSettings,
  upsertAttendanceSetting,
} from "@/features/attendance/server/attendance.service";
import { attendanceSettingSchema } from "@/features/attendance/validations/attendance.schema";
import { hasPermission } from "@/features/admin/server/rbac.service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ message: "Authentication required." }, { status: 401 });
  }

  const canManage =
    session.user.isSuperAdmin || hasPermission(session.user, "attendance_settings.manage");

  if (!canManage) {
    return Response.json({ message: "Access denied." }, { status: 403 });
  }

  const ownerAdminId = session.user.ownerAdminId ?? session.user.id;
  const settings = await listAttendanceSettings(ownerAdminId);
  return Response.json({ settings });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ message: "Authentication required." }, { status: 401 });
  }

  const canManage =
    session.user.isSuperAdmin || hasPermission(session.user, "attendance_settings.manage");

  if (!canManage) {
    return Response.json({ message: "Access denied." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = attendanceSettingSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { message: parsed.error.issues[0]?.message ?? "Invalid payload." },
      { status: 400 },
    );
  }

  const ownerAdminId = session.user.ownerAdminId ?? session.user.id;

  try {
    const setting = await upsertAttendanceSetting(ownerAdminId, session.user.id, parsed.data);
    return Response.json({ setting }, { status: 201 });
  } catch (err: any) {
    return Response.json({ message: err.message ?? "Save failed." }, { status: 400 });
  }
}
