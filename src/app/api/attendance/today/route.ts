import { auth } from "@/lib/auth";
import { getTodayAttendance, isAttendanceReady } from "@/features/attendance/server/attendance.service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ message: "Authentication required." }, { status: 401 });
    }

    const ready = await isAttendanceReady();
    if (!ready) {
      return Response.json({
        record: null,
        ready: false,
        message: "Attendance tables are not set up yet.",
      });
    }

    const record = await getTodayAttendance(session.user.id);
    return Response.json({ record, ready: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load today's attendance.";
    console.error("[api/attendance/today] Error:", err);
    return Response.json({ message }, { status: 500 });
  }
}
