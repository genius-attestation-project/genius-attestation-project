import { auth } from "@/lib/auth";
import { getTodayAttendance } from "@/features/attendance/server/attendance.service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ message: "Authentication required." }, { status: 401 });
  }

  const record = await getTodayAttendance(session.user.id);
  return Response.json({ record });
}
