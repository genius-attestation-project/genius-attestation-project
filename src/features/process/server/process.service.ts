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
    currentOfficeId: officeId,
    status: "HOME",
  };

  if (processType && processType !== "All") {
    whereClause.registration.processType = processType;
  }

  const count = await prisma.documentMovement.count({
    where: whereClause,
  });

  return { inbound: 0, inHand: count, completed: 0, rejected: 0, outbound: 0, total: count };
}

export async function listProcessAssignments(
  ownerAdminId: string,
  officeLocationName: string,
  processType?: string
) {
  const officeId = await resolveOfficeLocationId({ ownerAdminId, officeLocationName });
  if (!officeId) return [];

  const whereClause: any = {
    registration: { ownerAdminId },
    currentOfficeId: officeId,
    status: "HOME",
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
    currentLocation: "IN_HAND",
    status: "IN_HAND",
    receivedDate: formatDate(mov.createdAt),
    daysHeld: Math.floor((new Date().getTime() - mov.updatedAt.getTime()) / (1000 * 3600 * 24)),
    assignedUserId: mov.acceptedBy,
    assignedToName: mov.acceptedBy,
    remarks: mov.remarks,
  }));
}

export async function moveProcessAssignment(params: {
  assignmentId: string;
  action: "COMPLETED" | "REJECTED" | "SEND_TO_OFFICE";
  targetOfficeId?: string;
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
        currentOfficeId: officeId,
        registration: { ownerAdminId: params.ownerAdminId },
      },
    });

    if (!movement) throw new Error("Document movement not found in process module.");

    let nextOfficeId = "";
    let nextStatus = "";
    let processChain = Array.isArray(movement.processChain) ? [...movement.processChain] : [];

    if (params.action === "SEND_TO_OFFICE") {
      if (!params.targetOfficeId) throw new Error("Target office is required.");
      nextOfficeId = params.targetOfficeId;
      nextStatus = "INBOUND";
      
      if (!processChain.includes(officeId)) {
         processChain.push(officeId);
      }
    } else {
      nextStatus = params.action;
      const previousOfficeId = processChain.length > 0 ? processChain.pop() : null;
      
      if (previousOfficeId) {
        nextOfficeId = previousOfficeId as string;
      } else {
        if (!movement.originOfficeId) throw new Error("Origin office not found.");
        nextOfficeId = movement.originOfficeId;
      }
    }

    const nextOffice = await tx.officeLocation.findUnique({ where: { id: nextOfficeId } });

    const updated = await tx.documentMovement.update({
      where: { trackingNumber: movement.trackingNumber },
      data: {
        status: nextStatus,
        fromOfficeId: officeId,
        toOfficeId: nextOfficeId,
        currentOfficeId: nextOfficeId,
        currentModule: "REGISTRATION",
        processChain,
        remarks: params.remarks,
        updatedAt: new Date(),
      },
    });

    await tx.movementHistory.create({
      data: {
        trackingNumber: movement.trackingNumber,
        action: params.action === "SEND_TO_OFFICE" ? "Sent to Process Office" : `Marked as ${params.action}`,
        oldStatus: movement.status,
        newStatus: nextStatus,
        oldOffice: params.officeLocationName,
        newOffice: nextOffice?.officeName,
        performedBy: params.userId,
        remarks: params.remarks,
      },
    });

    if (params.action === "SEND_TO_OFFICE") {
      await tx.branchMovementRecord.create({
        data: {
          trackingNumber: movement.trackingNumber,
          sourceOffice: params.officeLocationName,
          destinationOffice: nextOffice?.officeName,
          transferredBy: params.userId,
          movementStatus: "In Transit",
          remarks: params.remarks,
          ownerAdminId: params.ownerAdminId,
        },
      });
    }

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
