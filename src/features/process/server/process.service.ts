import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ProcessItem, ProcessStats, ProcessLocation } from "../types/process.types";
import { resolveOfficeLocationId } from "@/lib/office-location";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export async function getProcessStats(ownerAdminId: string, officeLocationName: string, processType?: string): Promise<ProcessStats> {
  const officeId = await resolveOfficeLocationId({ ownerAdminId, officeLocationName });
  if (!officeId) {
    return { inbound: 0, inHand: 0, completed: 0, rejected: 0, outbound: 0, total: 0 };
  }

  const whereClause: any = {
    registration: { ownerAdminId },
    currentModule: "PROCESS",
    currentOfficeId: officeId,
  };

  if (processType && processType !== "All") {
    whereClause.registration.processType = processType;
  }

  const movements = await prisma.documentMovement.findMany({
    where: whereClause,
    select: { status: true },
  });

  return movements.reduce(
    (acc, row) => {
      acc.total += 1;
      if (row.status === "INBOUND") acc.inbound += 1;
      if (row.status === "IN_HAND") acc.inHand += 1;
      if (row.status === "COMPLETED") acc.completed += 1;
      if (row.status === "REJECTED") acc.rejected += 1;
      if (row.status === "OUTBOUND") acc.outbound += 1;
      return acc;
    },
    { inbound: 0, inHand: 0, completed: 0, rejected: 0, outbound: 0, total: 0 }
  );
}

export async function listProcessAssignments(
  ownerAdminId: string,
  officeLocationName: string,
  location: ProcessLocation,
  processType?: string
) {
  const officeId = await resolveOfficeLocationId({ ownerAdminId, officeLocationName });
  if (!officeId) return [];

  const whereClause: any = {
    registration: { ownerAdminId },
    currentModule: "PROCESS",
    currentOfficeId: officeId,
    status: location,
  };

  if (processType && processType !== "All") {
    whereClause.registration.processType = processType;
  }

  const movements = await prisma.documentMovement.findMany({
    where: whereClause,
    include: {
      registration: true,
      fromOffice: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return movements.map((mov) => ({
    id: mov.registrationId, // Used as assignmentId in UI
    registrationId: mov.registrationId,
    trackingNumber: mov.trackingNumber,
    clientName: mov.registration.customerName,
    processType: mov.registration.processType ?? mov.registration.documentType ?? "-",
    currentLocation: mov.status,
    status: mov.status,
    receivedDate: formatDate(mov.createdAt),
    daysHeld: Math.floor((new Date().getTime() - mov.updatedAt.getTime()) / (1000 * 3600 * 24)),
    assignedUserId: mov.acceptedBy,
    assignedToName: mov.acceptedBy,
    remarks: mov.remarks,
  }));
}

export async function moveProcessAssignment(params: {
  assignmentId: string; // This is now Registration ID
  targetLocation: ProcessLocation;
  userId: string;
  ownerAdminId: string;
  remarks?: string;
  officeLocationName?: string;
}) {
  const officeId = await resolveOfficeLocationId({
    ownerAdminId: params.ownerAdminId,
    officeLocationName: params.officeLocationName,
  });

  if (!officeId) throw new Error("Office not found");

  return prisma.$transaction(async (tx) => {
    const movement = await tx.documentMovement.findFirst({
      where: {
        registrationId: params.assignmentId,
        currentModule: "PROCESS",
        currentOfficeId: officeId,
        registration: { ownerAdminId: params.ownerAdminId },
      },
    });

    if (!movement) throw new Error("Document movement not found in process module.");

    const isOutbound = params.targetLocation === "OUTBOUND";

    const updated = await tx.documentMovement.update({
      where: { trackingNumber: movement.trackingNumber },
      data: {
        status: isOutbound ? "INBOUND" : params.targetLocation,
        currentModule: isOutbound ? "REGISTRATION" : "PROCESS",
        acceptedBy: params.targetLocation === "IN_HAND" ? params.userId : movement.acceptedBy,
        remarks: params.remarks,
        updatedAt: new Date(),
      },
    });

    await tx.movementHistory.create({
      data: {
        trackingNumber: movement.trackingNumber,
        action: isOutbound ? "Returned to Office" : `Moved to ${params.targetLocation}`,
        oldStatus: movement.status,
        newStatus: isOutbound ? "INBOUND" : params.targetLocation,
        oldOffice: params.officeLocationName,
        newOffice: params.officeLocationName,
        performedBy: params.userId,
        remarks: params.remarks,
      },
    });

    return updated;
  });
}

export async function getProcessHistory(trackingNumber: string, ownerAdminId: string) {
  // First verify the user owns this registration
  const registration = await prisma.registration.findFirst({
    where: { trackingNumber, ownerAdminId },
  });
  
  if (!registration) return [];

  const rows = await prisma.movementHistory.findMany({
    where: {
      trackingNumber,
    },
    orderBy: { performedAt: "asc" },
  });

  return rows.map(r => ({
    id: r.id,
    action: r.action,
    fromModule: r.oldStatus || "N/A",
    toModule: r.newStatus || "N/A",
    remarks: r.remarks,
    userName: r.performedBy,
    createdAt: r.performedAt,
  }));
}
