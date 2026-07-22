import { NextResponse, NextRequest } from "next/server";
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

export async function GET(request: NextRequest) {
  let session: any;
  let searchParams: URLSearchParams | undefined;
  
  try {
    session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    searchParams = new URL(request.url).searchParams;
    const dateRange = searchParams.get("dateRange") || "all";
    const officeLocationId = searchParams.get("officeLocationId");

    // Validate parameters (e.g., prevent weird inputs if needed)
    // If invalid parameter detected, throw a 400 error.
    if (searchParams.get("limit") && isNaN(Number(searchParams.get("limit")))) {
       return NextResponse.json({ error: "Invalid limit parameter" }, { status: 400 });
    }

    const ownerAdminId = session.user.ownerAdminId || session.user.id;
    const filters = buildReportFilters(searchParams, ownerAdminId);
    
    const baseWhere = filters.baseWhere;
    const leadWhere = applyFiltersToLead(baseWhere, filters);
    const regWhere = applyFiltersToRegistration(baseWhere, filters);
    
    const followupWhere = applyFiltersToFollowup(baseWhere, filters);
    const attendanceWhere = applyFiltersToAttendance(baseWhere, filters);
    const docMoveWhere = applyFiltersToDocumentMovement(baseWhere, filters);
    const processWhere = applyFiltersToProcess(baseWhere, filters);

    const logPrismaQuery = (queryName: string, whereObj: any) => {
      console.log(`\n--- [Executive Summary] Query: ${queryName} ---`);
      console.log(`User: ${session?.user?.id} (${session?.user?.email})`);
      console.log(`Query Params:`, Object.fromEntries(searchParams || []));
      console.log(`Prisma Where Object:`, JSON.stringify(whereObj, null, 2));
      console.log(`-------------------------------------------\n`);
    };

    // 1. Leads
    logPrismaQuery("Leads Count", leadWhere);
    const leadsCreated = await prisma.lead.count({ where: leadWhere });

    // 2. Registrations & Revenue
    logPrismaQuery("Registrations Data", regWhere);
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
    
    logPrismaQuery("Followups Count", finalFollowupWhere);
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
    logPrismaQuery("Attendance Data", attendanceWhere);
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
    logPrismaQuery("Document Movements Count", finalDocMoveWhere);
    const bmMovements = await prisma.documentMovement.count({
      where: finalDocMoveWhere,
    });

    const finalProcessWhere = {
      ...processWhere,
      registration: regWhere,
    };
    logPrismaQuery("Process Assignments Count", finalProcessWhere);
    const processActions = await prisma.processAssignment.count({
      where: finalProcessWhere,
    });

    // Workflow Approvals (Pending)
    const inactiveLeads = await prisma.leadWorkflowApproval.count({
      where: { requestType: "INACTIVE_LEAD", status: "Pending" }
    });
    const lobRequests = await prisma.leadWorkflowApproval.count({
      where: { requestType: "LOB_REQUEST", status: "Pending" }
    });
    const overdueFollowups = await prisma.leadWorkflowApproval.count({
      where: { requestType: "OVERDUE_FOLLOWUP", status: "Pending" }
    });

    // 6. Chart Data - Revenue Trend (Last 7 Days)
    const now = new Date();
    const last7Days = new Date(now);
    last7Days.setDate(last7Days.getDate() - 7);
    
    const recentRegWhere = { ...regWhere, createdAt: { gte: last7Days } };
    logPrismaQuery("Recent Registrations", recentRegWhere);
    const recentRegistrations = await prisma.registration.findMany({ 
      where: recentRegWhere,
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
    logPrismaQuery("Lead Sources GroupBy", leadWhere);
    const leadsBySource = await prisma.lead.groupBy({
      by: ['source'],
      where: leadWhere,
      _count: true
    });
    const leadSources = leadsBySource
      .filter(l => l.source)
      .map(l => ({ name: l.source, value: l._count }));

    // Customers Handled
    logPrismaQuery("Leads Emails", leadWhere);
    const leadsEmails = await prisma.lead.findMany({ 
      where: leadWhere,
      select: { email: true }
    });
    const uniqueCustomers = new Set(leadsEmails.map(l => l.email));
    const totalCustomersHandled = uniqueCustomers.size;

    let userName = "All Users";
    if (filters.userId) {
      logPrismaQuery("Find User Name", { id: filters.userId });
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
        inactiveLeads,
        lobRequests,
        overdueFollowups,
        charts: {
          revenueTrend,
          leadSources
        }
      }
    });
  } catch (error: any) {
    console.error("\n[Executive Summary] Fatal Error:");
    console.error(`- User: ${session?.user?.id}`);
    console.error(`- Query Params: ${searchParams ? JSON.stringify(Object.fromEntries(searchParams)) : 'N/A'}`);
    console.error(`- Stack Trace:\n`, error.stack || error);
    
    // Check if it's a Prisma validation error
    if (error.code === 'P2009' || error.name === 'PrismaClientValidationError') {
      return NextResponse.json({ error: "Bad Request: Invalid query parameter resulted in database validation error" }, { status: 400 });
    }
    
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
