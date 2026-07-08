import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { 
  buildReportFilters, 
  applyFiltersToLead, 
  applyFiltersToRegistration,
  applyFiltersToFollowup,
  applyFiltersToAttendance,
  applyFiltersToDocumentMovement,
  applyFiltersToProcess
} from "@/features/reports/server/report-filters";
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
    const filters = buildReportFilters(searchParams, ownerAdminId);
    
    const baseWhere = filters.baseWhere;
    const leadWhere = applyFiltersToLead(baseWhere, filters);
    const regWhere = applyFiltersToRegistration(baseWhere, filters);
    
    const followupWhere = applyFiltersToFollowup(baseWhere, filters);
    const attendanceWhere = applyFiltersToAttendance(baseWhere, filters);
    const docMoveWhere = applyFiltersToDocumentMovement(baseWhere, filters);
    const processWhere = applyFiltersToProcess(baseWhere, filters);

    // 1. Leads
    const leadsCreated = await prisma.lead.count({ where: leadWhere });

    // 2. Registrations & Revenue
    const registrations = await prisma.registration.findMany({ 
      where: regWhere,
      select: { totalCharges: true, balanceAmount: true, trackingStatus: true },
    });
    const revenueRegistrations = registrations.length;
    const revenueGenerated = registrations.reduce((acc, curr) => acc + Number(curr.totalCharges || 0), 0);
    const pendingRevenue = registrations.reduce((acc, curr) => acc + Number(curr.balanceAmount || 0), 0);
    const documentsDelivered = registrations.filter(r => r.trackingStatus === "Delivered").length;

    // 3. Followups
    const finalFollowupWhere = {
      ...followupWhere,
      lead: leadWhere,
    };
    
    const followupsCreated = await prisma.leadFollowupHistory.count({ 
      where: { ...finalFollowupWhere, actionType: "Created" } 
    });
    const followupsCompleted = await prisma.leadFollowupHistory.count({ 
      where: { ...finalFollowupWhere, actionType: "Completed" } 
    });
    const followupsExtended = await prisma.leadFollowupHistory.count({ 
      where: { ...finalFollowupWhere, actionType: "Rescheduled" } 
    });
    const callsMade = followupsCompleted; // Approximation

    // 4. Attendance
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: attendanceWhere, 
      select: { status: true, workingHours: true, dailySummary: true },
    });
    const presentDays = attendanceRecords.filter(a => a.status === "Present").length;
    const totalWorkingHours = attendanceRecords.reduce((acc, curr) => acc + Number(curr.workingHours || 0), 0);
    const dailySummariesSubmitted = attendanceRecords.filter(a => a.dailySummary != null).length;

    // 5. Operations
    const finalDocMoveWhere = {
      ...docMoveWhere,
      registration: regWhere,
    };
    const bmMovements = await prisma.documentMovement.count({
      where: finalDocMoveWhere,
    });

    const finalProcessWhere = {
      ...processWhere,
      registration: regWhere,
    };
    const processActions = await prisma.processAssignment.count({
      where: finalProcessWhere,
    });

    // 6. Chart Data - Revenue Trend (Last 7 Days)
    const now = new Date();
    const last7Days = new Date(now);
    last7Days.setDate(last7Days.getDate() - 7);
    
    const recentRegistrations = await prisma.registration.findMany({ 
      where: { ...regWhere, createdAt: { gte: last7Days } },
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
      where: leadWhere,
      _count: true
    });
    const leadSources = leadsBySource
      .filter(l => l.source)
      .map(l => ({ name: l.source, value: l._count }));

    // Customers Handled
    const leadsEmails = await prisma.lead.findMany({ 
      where: leadWhere,
      select: { email: true }
    });
    const uniqueCustomers = new Set(leadsEmails.map(l => l.email));
    const totalCustomersHandled = uniqueCustomers.size;

    let userName = "All Users";
    if (filters.userId) {
      const user = await prisma.user.findUnique({ where: { id: filters.userId }, select: { name: true, email: true } });
      if (user) {
         userName = user.name || user.email || "Unknown";
      }
    }

    return NextResponse.json({
      data: {
        userName,
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
