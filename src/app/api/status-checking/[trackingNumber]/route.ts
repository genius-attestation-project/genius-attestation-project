import { NextResponse } from "next/server";

import { requireApiAuth } from "@/middleware/auth.middleware";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ trackingNumber: string }> }) {
  try {
    const session = await requireApiAuth();
    const { trackingNumber } = await params;

    const registration = await prisma.registration.findFirst({
      where: {
        ownerAdminId: session.user.ownerAdminId,
        trackingNumber: trackingNumber,
      },
      include: {
        auditTrail: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!registration) {
      return NextResponse.json({ message: "No record found for this tracking number." }, { status: 404 });
    }

    // Mapping relevant status fields
    const payload = {
      trackingNumber: registration.trackingNumber,
      customerName: registration.customerName,
      service: registration.processType || registration.documentType || "-",
      sourceOffice: registration.regionOfRegistration || "-",
      deliveryLocation: registration.deliveryLocation || "-",
      createdAt: registration.createdAt.toISOString(),
      trackingStatus: registration.trackingStatus,
      approvalStatus: registration.approvalStatus,
      bmStatus: registration.bmStatus,
      paymentStatus: registration.paymentStatus,
      isBmLocked: registration.isBmLocked,
      auditTrail: registration.auditTrail.map((item) => ({
        id: item.id,
        action: item.action,
        description: item.description,
        performedBy: item.performedBy,
        createdAt: item.createdAt.toISOString(),
      })),
    };

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to fetch status." },
      { status: 500 },
    );
  }
}
