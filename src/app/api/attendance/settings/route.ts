import { auth } from "@/lib/auth";
import {
  listAttendanceSettings,
  upsertAttendanceSetting,
} from "@/features/attendance/server/attendance.service";
import { attendanceSettingSchema } from "@/features/attendance/validations/attendance.schema";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { NextRequest } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ message: "Authentication required." }, { status: 401 });
    }

    // Super admins always have access; others need the specific permission
    const canManage =
      session.user.isSuperAdmin ||
      hasPermission(session.user, "attendance_settings.manage");

    if (!canManage) {
      return Response.json({ message: "Access denied." }, { status: 403 });
    }

    const ownerAdminId = session.user.ownerAdminId ?? session.user.id;
    const settings = await listAttendanceSettings(ownerAdminId);
    return Response.json({ settings });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load attendance settings.";
    console.error("[api/attendance/settings GET] Error:", err);
    return Response.json({ message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ message: "Authentication required." }, { status: 401 });
    }

    const canManage =
      session.user.isSuperAdmin ||
      hasPermission(session.user, "attendance_settings.manage");

    if (!canManage) {
      return Response.json({ message: "Access denied." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    console.log("[api/attendance/settings POST] body:", body);

    const parsed = attendanceSettingSchema.safeParse(body);

    if (!parsed.success) {
      console.error("[api/attendance/settings POST] Validation errors:", parsed.error.issues);
      return Response.json(
        {
          message: parsed.error.issues[0]?.message ?? "Invalid payload.",
          issues: parsed.error.issues,
        },
        { status: 400 },
      );
    }

    const ownerAdminId = session.user.ownerAdminId ?? session.user.id;
    const setting = await upsertAttendanceSetting(ownerAdminId, session.user.id, parsed.data);
    return Response.json({ setting }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save attendance setting.";
    console.error("[api/attendance/settings POST] Error:", err);
    const status = message.includes("workspace") ? 400 : 500;
    return Response.json({ message }, { status });
  }
}
