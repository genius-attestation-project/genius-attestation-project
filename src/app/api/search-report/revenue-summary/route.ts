import { Prisma } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET(request: Request) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;

    if (!ownerAdminId) {
      return jsonError("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const officeLocation = searchParams.get("officeLocation");
    const staffMember = searchParams.get("staffMember");
    const processType = searchParams.get("processType");
    const paymentStatus = searchParams.get("paymentStatus");
    const approvalStatus = searchParams.get("approvalStatus");

    const where: Prisma.RegistrationWhereInput = {
      ownerAdminId,
      ...(fromDate && toDate
        ? {
            createdAt: {
              gte: new Date(`${fromDate}T00:00:00.000Z`),
              lte: new Date(`${toDate}T23:59:59.999Z`),
            },
          }
        : {}),
      ...(officeLocation ? { regionOfRegistration: officeLocation } : {}),
      ...(staffMember ? { createdBy: staffMember } : {}),
      ...(processType ? { processType } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(approvalStatus ? { approvalStatus } : {}),
    };

    // 1. Overall KPIs
    const aggregate = await prisma.registration.aggregate({
      where,
      _sum: {
        totalCharges: true,
        advancePaid: true,
        balanceAmount: true,
      },
      _count: {
        id: true,
      },
    });

    const approvedAggregate = await prisma.registration.aggregate({
      where: { ...where, approvalStatus: "Approved" },
      _sum: { totalCharges: true },
    });

    const pendingAggregate = await prisma.registration.aggregate({
      where: { ...where, approvalStatus: "Pending" },
      _sum: { totalCharges: true },
    });

    // 2. Group by Office Location
    const byOffice = await prisma.registration.groupBy({
      by: ["regionOfRegistration"],
      where,
      _sum: {
        totalCharges: true,
        advancePaid: true,
        balanceAmount: true,
      },
      _count: {
        id: true,
      },
    });

    // 3. Group by Staff
    const byStaff = await prisma.registration.groupBy({
      by: ["createdBy"],
      where,
      _sum: {
        totalCharges: true,
        advancePaid: true,
        balanceAmount: true,
      },
      _count: {
        id: true,
      },
    });

    // 4. Group by Process Type
    const byProcessType = await prisma.registration.groupBy({
      by: ["processType"],
      where,
      _sum: {
        totalCharges: true,
      },
      _count: {
        id: true,
      },
    });

    // 5. Raw Data Table (limited to 500 for performance on UI)
    const tableData = await prisma.registration.findMany({
      where,
      select: {
        trackingNumber: true,
        customerName: true,
        processType: true,
        regionOfRegistration: true,
        createdBy: true,
        totalCharges: true,
        advancePaid: true,
        balanceAmount: true,
        approvalStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    // Extract unique staff and locations to populate dropdowns (if not fetching from users/departments)
    // For Staff dropdowns, ideally we get all users, but getting distinct createdBy helps too.
    const distinctOffices = await prisma.officeLocation.findMany({
      where: { ownerAdminId },
      select: { officeName: true },
    });

    const distinctStaff = await prisma.user.findMany({
      where: { ownerAdminId },
      select: { name: true, email: true },
    });

    return jsonOk({
      kpis: {
        totalRegistrations: aggregate._count.id,
        totalRevenue: Number(aggregate._sum.totalCharges ?? 0),
        advancePaid: Number(aggregate._sum.advancePaid ?? 0),
        balancePending: Number(aggregate._sum.balanceAmount ?? 0),
        approvedRevenue: Number(approvedAggregate._sum.totalCharges ?? 0),
        pendingRevenue: Number(pendingAggregate._sum.totalCharges ?? 0),
      },
      byOffice: byOffice.map((o) => ({
        office: o.regionOfRegistration || "Unknown",
        revenue: Number(o._sum.totalCharges ?? 0),
        registrations: o._count.id,
        advancePaid: Number(o._sum.advancePaid ?? 0),
        balance: Number(o._sum.balanceAmount ?? 0),
      })),
      byStaff: byStaff.map((s) => ({
        staff: s.createdBy || "Unknown",
        revenue: Number(s._sum.totalCharges ?? 0),
        registrations: s._count.id,
        advancePaid: Number(s._sum.advancePaid ?? 0),
        balance: Number(s._sum.balanceAmount ?? 0),
      })),
      byProcessType: byProcessType.map((p) => ({
        process: p.processType || "Unknown",
        revenue: Number(p._sum.totalCharges ?? 0),
        registrations: p._count.id,
      })),
      tableData,
      options: {
        offices: distinctOffices.map((o) => o.officeName),
        staff: distinctStaff.map((s) => s.name || s.email),
      },
    });
  } catch (error) {
    console.error("Revenue summary fetch failed", error);
    return jsonError("Failed to fetch revenue summary.", 500);
  }
}
