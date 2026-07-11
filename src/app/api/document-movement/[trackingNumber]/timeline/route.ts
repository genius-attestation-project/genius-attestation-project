import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingNumber: string }> }
) {
  const denied = await requireApiPermission("document_movement.view");
  if (denied) return denied;

  try {
    const resolvedParams = await params;
    const { trackingNumber } = resolvedParams;

    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const registration = await prisma.registration.findFirst({
      where: { trackingNumber, ownerAdminId },
      include: {
        documentMovements: {
          include: {
            currentOffice: true,
          }
        },
      },
    });

    if (!registration) {
      return jsonError("Registration not found", 404);
    }

    // 1. Fetch BM Movement Records
    const bmRecords = await (prisma as any).branchMovementRecord.findMany({
      where: { trackingNumber, ownerAdminId },
    });

    // 2. Fetch Process Movement Records via ProcessAssignments
    const processAssignments = await prisma.processAssignment.findMany({
      where: { trackingNumber, ownerAdminId },
      include: { movements: true },
    });
    const processMovements = processAssignments.flatMap(pa => pa.movements);

    // 3. Fetch Movement History
    const movementHistory = await prisma.movementHistory.findMany({
      where: { trackingNumber },
    });

    // Normalize into TimelineEvent array
    const timeline: any[] = [];

    // Map BM Records
    bmRecords.forEach((record: any) => {
      timeline.push({
        id: `bm-${record.id}`,
        from: record.sourceOffice || "-",
        to: record.destinationOffice || "-",
        module: "BM Report",
        date: record.transferDateTime,
        status: record.movementStatus, // "Completed", "In Transit", etc.
        transferredBy: record.transferredBy || null,
        receivedBy: record.receivedBy || null,
        courierNumber: record.courierNumber || null,
        remarks: record.remarks || null,
        sortDate: new Date(record.transferDateTime).getTime(),
      });
    });

    // Map Process Movements
    processMovements.forEach(record => {
      timeline.push({
        id: `proc-${record.id}`,
        from: record.fromLocation,
        to: record.toLocation,
        module: "Process Module",
        date: record.createdAt,
        status: record.action === "Sent" ? "In Transit" : record.action === "Received" ? "Completed" : record.action,
        transferredBy: record.userId || null,
        receivedBy: null, // Depending on next record if received
        courierNumber: null,
        remarks: record.remarks || null,
        sortDate: new Date(record.createdAt).getTime(),
      });
    });

    // Map Movement History
    movementHistory.forEach(record => {
      // Only include if it represents an actual office-to-office transfer that isn't captured above
      // But MovementHistory tracks registration and delivery movements
      if (record.oldOffice && record.newOffice && record.action !== "Accepted") {
        timeline.push({
          id: `hist-${record.id}`,
          from: record.oldOffice,
          to: record.newOffice,
          module: "Revenue Registration",
          date: record.performedAt,
          status: record.action === "Sent" ? "In Transit" : record.action,
          transferredBy: record.performedBy || null,
          receivedBy: null,
          courierNumber: null,
          remarks: record.remarks || null,
          sortDate: new Date(record.performedAt).getTime(),
        });
      }
    });

    // Sort chronologically (oldest first or newest first, let's do newest first for timeline)
    timeline.sort((a, b) => b.sortDate - a.sortDate);

    // Get current location info
    const currentMovement = registration.documentMovements[0];
    let currentOfficeName = "-";
    if (currentMovement?.currentOffice) {
      currentOfficeName = currentMovement.currentOffice.officeName;
    } else if (registration.regionOfRegistration) {
      currentOfficeName = registration.regionOfRegistration;
    }

    return jsonOk({
      registration: {
        trackingNumber: registration.trackingNumber,
        customerName: registration.customerName,
        service: registration.processType ?? registration.documentType ?? "-",
        status: registration.trackingStatus,
        updatedAt: registration.updatedAt,
      },
      currentLocation: currentMovement ? {
        officeName: currentOfficeName,
        status: currentMovement.status,
        receivedAt: currentMovement.acceptedAt,
        handledBy: currentMovement.acceptedBy,
        updatedAt: currentMovement.updatedAt,
      } : null,
      timeline: timeline,
    });
  } catch (error) {
    console.error("[timeline_api_error]", error);
    return jsonError("Internal Server Error", 500);
  }
}
