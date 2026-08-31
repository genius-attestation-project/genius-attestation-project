import { auth } from "@/lib/auth";
import { getAttendanceStats } from "@/features/attendance/server/attendance.service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ message: "Authentication required." }, { status: 401 });
    }

    const ownerAdminId = session.user.ownerAdminId ?? session.user.id;
    const stats = await getAttendanceStats(ownerAdminId);
    return Response.json({ stats });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load attendance stats.";
    console.error("[api/attendance/stats] Error:", err);
    return Response.json({ message }, { status: 500 });
  }
}
