import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get("dateRange") || "all";
    const officeLocationId = searchParams.get("officeLocationId");

    // Default to the current admin's ownerAdminId
    const ownerAdminId = session.user.ownerAdminId || session.user.id;
    const baseWhere: any = { ownerAdminId };

    // Build Date Filter (simple example)
    const now = new Date();
    let startDate = new Date(0);
    let endDate = now;

    if (dateRange === "today") {
      startDate = new Date(now.setHours(0, 0, 0, 0));
    } else if (dateRange === "thisMonth") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    // Expand date logic as needed...

    if (dateRange !== "all") {
      baseWhere.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    // 1. Leads
    const leadsCreated = await prisma.lead.count({
      where: baseWhere,
    });

    // 2. Registrations & Revenue
    const registrations = await prisma.registration.findMany({
      where: baseWhere,
      select: { totalCharges: true, balanceAmount: true, trackingStatus: true },
    });
    const revenueRegistrations = registrations.length;
    const revenueGenerated = registrations.reduce((acc, curr) => acc + Number(curr.totalCharges || 0), 0);
    const pendingRevenue = registrations.reduce((acc, curr) => acc + Number(curr.balanceAmount || 0), 0);
    const documentsDelivered = registrations.filter(r => r.trackingStatus === "Delivered").length;

    // 3. Followups
    const followupsCreated = await prisma.leadFollowupHistory.count({
      where: { ...baseWhere, actionType: "Created" },
    });
    const followupsCompleted = await prisma.leadFollowupHistory.count({
      where: { ...baseWhere, actionType: "Completed" },
    });
    const followupsExtended = await prisma.leadFollowupHistory.count({
      where: { ...baseWhere, actionType: "Rescheduled" },
    });
    const callsMade = followupsCompleted; // Approximation

    // 4. Attendance
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: baseWhere, // Assuming we add ownerAdminId to attendance in schema, if not use user relation
      select: { status: true, workingHours: true, dailySummary: true },
    });
    const presentDays = attendanceRecords.filter(a => a.status === "Present").length;
    const totalWorkingHours = attendanceRecords.reduce((acc, curr) => acc + Number(curr.workingHours || 0), 0);
    const dailySummariesSubmitted = attendanceRecords.filter(a => a.dailySummary != null).length;

    // 5. Operations
    const bmMovements = await prisma.documentMovement.count({
      // We don't have ownerAdminId directly on DocumentMovement in schema, we might need to join Registration
      where: {
        registration: { ownerAdminId }
      },
    });

    const processActions = await prisma.processAssignment.count({
      where: baseWhere,
    });

    // 6. Chart Data - Revenue Trend (Last 7 Days)
    const last7Days = new Date(now);
    last7Days.setDate(last7Days.getDate() - 7);
    
    const recentRegistrations = await prisma.registration.findMany({
      where: { ...baseWhere, createdAt: { gte: last7Days } },
      select: { createdAt: true, totalCharges: true }
    });

    const revenueTrendMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      revenueTrendMap[d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] = 0;
    }
    
    recentRegistrations.forEach(r => {
      const dStr = new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (revenueTrendMap[dStr] !== undefined) {
        revenueTrendMap[dStr] += Number(r.totalCharges || 0);
      }
    });

    const revenueTrend = Object.keys(revenueTrendMap).map(date => ({
      date,
      revenue: revenueTrendMap[date]
    }));

    // Chart Data - Lead Source
    const leadsBySource = await prisma.lead.groupBy({
      by: ['source'],
      where: baseWhere,
      _count: true
    });
    const leadSources = leadsBySource
      .filter(l => l.source)
      .map(l => ({ name: l.source, value: l._count }));

    // Customers Handled
    const leadsEmails = await prisma.lead.findMany({
      where: baseWhere,
      select: { email: true }
    });
    const uniqueCustomers = new Set(leadsEmails.map(l => l.email));
    const totalCustomersHandled = uniqueCustomers.size;

    return NextResponse.json({
      data: {
        leadsCreated,
        revenueRegistrations,
        revenueGenerated,
        pendingRevenue,
        followupsCreated,
        followupsCompleted,
        followupsExtended,
        callsMade,
        presentDays,
        totalWorkingHours,
        dailySummariesSubmitted,
        bmMovements,
        processActions,
        documentsDelivered,
        totalCustomersHandled,
        charts: {
          revenueTrend,
          leadSources
        }
      }
    });
  } catch (error) {
    console.error("Error fetching executive summary:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
