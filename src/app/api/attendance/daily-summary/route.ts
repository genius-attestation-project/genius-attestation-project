import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayDate } from "@/features/attendance/server/attendance.shared";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return Response.json({ message: "Unauthorized" }, { status: 401 });

    const isSuperAdmin = session.user.isSuperAdmin;
    const canViewAll = session.user.permissions.includes("attendance.summary.view");

    if (!isSuperAdmin && !canViewAll) {
      return Response.json({ message: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const employee = searchParams.get("employee");
    const departmentId = searchParams.get("departmentId");
    const officeLocationId = searchParams.get("officeLocationId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const ownerAdminId = session.user.ownerAdminId ?? session.user.id;

    const where: any = { ownerAdminId };

    if (dateFrom && dateTo) {
      where.summaryDate = { gte: new Date(dateFrom), lte: new Date(dateTo) };
    }
    if (employee) {
      where.userId = employee;
    }
    if (departmentId || officeLocationId) {
      where.user = {};
      if (departmentId) where.user.departmentId = departmentId;
      if (officeLocationId) where.user.officeLocationId = officeLocationId;
    }
    if (status) {
      where.attendance = { status };
    }
    if (search) {
      where.OR = [
        { summary: { contains: search } },
        { user: { name: { contains: search } } },
      ];
    }

    const summaries = await prisma.attendanceDailySummary.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, departmentRef: { select: { name: true } }, officeLocationRef: { select: { officeName: true } } } },
        attendance: { select: { checkinTime: true, checkoutTime: true, status: true, dailySummary: true, approvalStatus: true, approvedBy: true, approvedAt: true } },
      },
      orderBy: { summaryDate: "desc" },
    });

    return Response.json({ summaries });
  } catch (err: any) {
    return Response.json({ message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return Response.json({ message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { summary } = body;

    if (!summary || summary.length < 20 || summary.length > 5000) {
      return Response.json({ message: "Summary must be between 20 and 5000 characters." }, { status: 400 });
    }

    const attendance = await prisma.attendanceRecord.findUnique({
      where: { userId_attendanceDate: { userId: session.user.id, attendanceDate: todayDate() } },
    });

    if (!attendance) {
      return Response.json({ message: "No attendance record found for today." }, { status: 400 });
    }

    const ownerAdminId = session.user.ownerAdminId ?? session.user.id;

    const existing = await prisma.attendanceDailySummary.findUnique({
      where: { userId_summaryDate: { userId: session.user.id, summaryDate: todayDate() } },
    });

    if (existing) {
      return Response.json({ message: "Summary already exists for today. Use Edit." }, { status: 400 });
    }

    const newSummary = await prisma.attendanceDailySummary.create({
      data: {
        userId: session.user.id,
        ownerAdminId,
        attendanceId: attendance.id,
        summary,
        summaryDate: todayDate(),
      },
    });

    return Response.json({ record: newSummary });
  } catch (err: any) {
    return Response.json({ message: err.message }, { status: 500 });
  }
}
