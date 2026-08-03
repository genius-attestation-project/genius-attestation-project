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

    // Fetch related timeline, activity movements, advance payment approvals, and audit history.
    // The process-type mapping is the source of truth for the full activity list, including
    // activities that have not yet been started for this tracking number.
    const [subPackageMovements, movementHistory, workflowHistory, advancePaymentApprovals, processType] = await Promise.all([
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
      prisma.advancePaymentApproval.findMany({
        where: { registrationId: registration.id },
        orderBy: { requestedAt: "desc" },
        include: { auditLogs: { orderBy: { createdAt: "desc" } } },
      }),
      registration.processType
        ? prisma.masterData.findFirst({
            where: {
              type: "PROCESS_TYPES",
              name: registration.processType,
              ownerAdminId,
            },
            include: { subPackages: { orderBy: { name: "asc" } } },
          })
        : null,
    ]);

    const movementsByActivity = new Map<string, any>();
    for (const movement of subPackageMovements) {
      if (!movementsByActivity.has(movement.subPackageId)) {
        movementsByActivity.set(movement.subPackageId, movement);
      }
    }
    const configuredActivities = processType?.subPackages || [];
    const activityStatuses = configuredActivities.map((activity) => {
      const movement = movementsByActivity.get(activity.id);
      const status = movement?.status === "Completed"
        ? "Completed"
        : movement?.status === "Rejected"
          ? "Rejected"
          : movement?.status === "In Progress"
            ? "In Progress"
            : "Pending";
      const date = status === "Completed"
        ? movement.completedAt
        : status === "Rejected"
          ? movement.rejectedAt
          : null;

      return {
        id: activity.id,
        name: activity.name,
        status,
        date: date?.toISOString() || null,
        rejectionReason: status === "Rejected" ? movement.rejectionReason || null : null,
      };
    });

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
        activities: activityStatuses,
      },
      subPackageMovements,
      movementHistory,
      workflowHistory,
      advancePaymentApprovals: advancePaymentApprovals.map((item) => ({
        id: item.id,
        registrationId: item.registrationId,
        trackingNumber: item.trackingNumber,
        leadId: item.leadId || "-",
        customerName: item.customerName,
        documentName: item.documentName || "-",
        totalAmount: Number(item.totalAmount),
        advanceAmount: Number(item.advanceAmount),
        remainingBalance: Number(item.remainingBalance),
        currentAdvancePaid: item.currentAdvancePaid ? Number(item.currentAdvancePaid) : 0,
        currentBalance: item.currentBalance ? Number(item.currentBalance) : 0,
        paymentDate: item.paymentDate ? item.paymentDate.toISOString() : item.requestedAt.toISOString(),
        paymentMode: item.paymentMode || "Cash",
        referenceNumber: item.referenceNumber || "-",
        collectedBy: item.collectedBy || item.requestedByName || "-",
        remarks: item.remarks || null,
        proofFileType: item.proofFileType || null,
        receiptFileId: item.receiptFileId || null,
        receiptFileUrl: item.receiptFileUrl || null,
        receiptFileName: item.receiptFileName || null,
        status: item.status,
        requestedBy: item.requestedByName || "-",
        requestedById: item.requestedById,
        requestedDate: item.requestedAt.toISOString(),
        approvedBy: item.approvedByName || null,
        approvedDate: item.approvedAt?.toISOString() || null,
        rejectedBy: item.rejectedByName || null,
        rejectedDate: item.rejectedAt?.toISOString() || null,
        rejectionReason: item.rejectionReason || null,
        auditLogs: item.auditLogs.map((log) => ({
          id: log.id,
          action: log.action,
          performedBy: log.performedByName || log.performedBy,
          remarks: log.remarks,
          ipAddress: log.ipAddress,
          createdAt: log.createdAt.toISOString(),
        })),
      })),
    });
  } catch (error: any) {
    console.error("[GET_DOCUMENT_DETAILS_ERROR]", error);
    return NextResponse.json(
      { message: error?.message || "Failed to load document details." },
      { status: 500 }
    );
  }
}
