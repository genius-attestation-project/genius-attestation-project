import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayDate } from "@/features/attendance/server/attendance.shared";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return Response.json({ message: "Unauthorized" }, { status: 401 });

    const record = await prisma.attendanceDailySummary.findUnique({
      where: { userId_summaryDate: { userId: session.user.id, summaryDate: todayDate() } },
    });

    return Response.json({ record });
  } catch (err: any) {
    return Response.json({ message: err.message }, { status: 500 });
  }
}
