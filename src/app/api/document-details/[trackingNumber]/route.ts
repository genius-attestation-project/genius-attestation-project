import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateNumberOfDays } from "@/utils/days-calculator";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ trackingNumber: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized access." }, { status: 401 });
    }

    const { trackingNumber } = await params;
    if (!trackingNumber) {
      return NextResponse.json({ message: "Tracking number is required." }, { status: 400 });
    }

    const ownerAdminId = session.user.ownerAdminId ?? session.user.id;

    // Fetch primary Registration with relations
    const registration = await prisma.registration.findFirst({
      where: {
        trackingNumber: trackingNumber.trim(),
        ownerAdminId,
      },
      include: {
        corporateDetail: true,
        files: {
          include: {
            fileStorage: true,
          },
        },
        documentMovements: {
          include: {
            fromOffice: true,
            toOffice: true,
            currentOffice: true,
          },
        },
        auditTrail: {
          orderBy: { createdAt: "desc" },
        },
        paymentUpdates: {
          orderBy: { submittedAt: "desc" },
        },
      },
    });

    if (!registration) {
      return NextResponse.json(
        { message: `Document with Tracking Number "${trackingNumber}" was not found.` },
        { status: 404 }
      );
    }

    // Fetch related timeline, subpackage movements, and audit history
    const [subPackageMovements, movementHistory, workflowHistory] = await Promise.all([
      (prisma as any).subPackageMovement.findMany({
        where: { trackingNumber: trackingNumber.trim() },
        orderBy: { createdAt: "desc" },
      }),
      prisma.movementHistory.findMany({
        where: { trackingNumber: trackingNumber.trim() },
        orderBy: { performedAt: "desc" },
      }),
      (prisma as any).documentWorkflowHistory.findMany({
        where: { trackingNumber: trackingNumber.trim() },
        orderBy: { performedAt: "desc" },
      }),
    ]);

    const latestMovement = registration.documentMovements[0] || null;
    const latestSubPackage = subPackageMovements[0] || null;

    // Current Process Information
    const currentOffice =
      latestMovement?.currentOffice?.officeName ||
      registration.regionOfRegistration ||
      "Main Office";
    const currentDepartment = "Processing & Verification Operations";
    const currentPackage = registration.processType || registration.externalProcess || "General";
    const currentSubPackage = registration.subPackage || latestSubPackage?.subPackageId || "-";
    const currentHandler =
      latestMovement?.receivedBy ||
      registration.registeredPerson ||
      registration.createdBy ||
      "System Handler";
    const currentStatus =
      registration.trackingStatus ||
      latestMovement?.currentStatus ||
      latestMovement?.status ||
      "Registered";
    const currentStage =
      latestMovement?.currentStatus ||
      registration.trackingStatus ||
      "Registered";

    const daysCount = calculateNumberOfDays(
      latestMovement?.receivedAt || latestMovement?.updatedAt || registration.createdAt
    );

    return NextResponse.json({
      registration: {
        ...registration,
        totalCharges: Number(registration.totalCharges || 0),
        advancePaid: Number(registration.advancePaid || 0),
        balanceAmount: Number(registration.balanceAmount || 0),
      },
      currentProcess: {
        currentOffice,
        currentDepartment,
        currentPackage,
        currentSubPackage,
        currentHandler,
        currentStatus,
        currentStage,
        daysCount,
      },
      subPackageMovements,
      movementHistory,
      workflowHistory,
    });
  } catch (error: any) {
    console.error("[GET_DOCUMENT_DETAILS_ERROR]", error);
    return NextResponse.json(
      { message: error?.message || "Failed to load document details." },
      { status: 500 }
    );
  }
}
