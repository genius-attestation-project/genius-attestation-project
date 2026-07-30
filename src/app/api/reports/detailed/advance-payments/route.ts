import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.ownerAdminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const status = searchParams.get("approvalStatus") || searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    const where: any = {
      ownerAdminId: session.user.ownerAdminId,
      ...(status && status !== "All" ? { status } : {}),
    };

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(`${fromDate}T00:00:00.000Z`);
      if (toDate) where.createdAt.lte = new Date(`${toDate}T23:59:59.999Z`);
    }

    if (search) {
      where.OR = [
        { trackingNumber: { contains: search } },
        { customerName: { contains: search } },
        { mobile: { contains: search } },
        { leadId: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.advancePaymentApproval.findMany({
        where,
        orderBy: { requestedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.advancePaymentApproval.count({ where }),
    ]);

    const formattedData = items.map((item) => ({
      id: item.id,
      trackingNumber: item.trackingNumber,
      leadId: item.leadId || "-",
      customerName: item.customerName,
      mobile: item.mobile,
      office: item.office || "-",
      registeredBy: item.registeredPerson || item.requestedByName || "-",
      advanceAmount: Number(item.advanceAmount),
      totalAmount: Number(item.totalAmount),
      remainingBalance: Number(item.remainingBalance),
      approvalStatus: item.status,
      approvedBy: item.approvedByName || "-",
      approvedDate: item.approvedAt ? item.approvedAt.toISOString() : "-",
      rejectedBy: item.rejectedByName || "-",
      rejectedDate: item.rejectedAt ? item.rejectedAt.toISOString() : "-",
      rejectionReason: item.rejectionReason || "-",
      requestedBy: item.requestedByName || "-",
      requestedDate: item.requestedAt.toISOString(),
      createdAt: item.createdAt.toISOString(),
    }));

    return NextResponse.json({
      data: formattedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error: any) {
    console.error("[GET /api/reports/detailed/advance-payments] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch advance payment approval report." },
      { status: 500 },
    );
  }
}
