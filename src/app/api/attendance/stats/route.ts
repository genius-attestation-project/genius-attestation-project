import { auth } from "@/lib/auth";
import { getAttendanceStats } from "@/features/attendance/server/attendance.service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ message: "Authentication required." }, { status: 401 });
  }

  const ownerAdminId = session.user.ownerAdminId ?? session.user.id;
  const stats = await getAttendanceStats(ownerAdminId);
  return Response.json({ stats });
}
