import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return Response.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { summary } = body;
    const { id } = await params;

    if (!summary || summary.length < 20 || summary.length > 5000) {
      return Response.json({ message: "Summary must be between 20 and 5000 characters." }, { status: 400 });
    }

    const existing = await prisma.attendanceDailySummary.findUnique({
      where: { id },
    });

    if (!existing) {
      return Response.json({ message: "Summary not found." }, { status: 404 });
    }

    // Only allow editing own summary, or superadmin
    if (existing.userId !== session.user.id && !session.user.isSuperAdmin) {
      return Response.json({ message: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.attendanceDailySummary.update({
      where: { id },
      data: { summary },
    });

    await prisma.attendanceRecord.update({
      where: { id: existing.attendanceId },
      data: { dailySummary: summary },
    });

    return Response.json({ record: updated });
  } catch (err: any) {
    return Response.json({ message: err.message }, { status: 500 });
  }
}
