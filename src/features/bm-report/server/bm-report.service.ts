import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { BmReportItem, BmReportStats } from "@/features/bm-report/types/bm-report.types";
import { resolveOfficeLocationId } from "@/lib/office-location";

function logBmWorkflow(message: string, payload: Record<string, unknown>) {
  console.info(`[bm-report] ${message}`, payload);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function isSameDay(date: Date, compare: Date) {
  return (
    date.getFullYear() === compare.getFullYear() &&
    date.getMonth() === compare.getMonth() &&
    date.getDate() === compare.getDate()
  );
}

function mapMovement(movement: any): BmReportItem {
  const reg = movement.registration;
  return {
    id: reg.id, // using registrationId for backward compatibility in UI
    registrationNumber: movement.trackingNumber,
    clientName: reg.customerName,
    service: reg.processType ?? reg.documentType ?? "-",
    sourceOffice: movement.fromOffice?.officeName ?? reg.regionOfRegistration ?? "-",
    deliveryLocation: reg.deliveryLocation ?? "-",
    createdBy: movement.createdBy ?? reg.createdBy ?? "-",
    createdDate: formatDate(movement.createdAt),
    status: movement.status,
    acceptedAt: movement.acceptedAt ? movement.acceptedAt.toISOString() : null,
    acceptedDate: movement.acceptedAt ? formatDate(movement.acceptedAt) : null,
    acceptedBy: movement.acceptedBy ?? null,
    isBmLocked: reg.isBmLocked,
    bmExtensionStatus: reg.bmExtensionStatus,
  };
}

export async function getBmReportStats(ownerAdminId: string, officeLocationName: string): Promise<BmReportStats> {
  const officeId = await resolveOfficeLocationId({ ownerAdminId, officeLocationName });
  if (!officeId) {
    return { totalInward: 0, totalOutward: 0, acceptedToday: 0, pendingInward: 0 };
  }

  const movements = await prisma.documentMovement.findMany({
    where: {
      registration: { ownerAdminId },
      currentModule: "REGISTRATION",
    },
    select: {
      status: true,
      currentOfficeId: true,
      fromOfficeId: true,
      acceptedAt: true,
    }
  });

  const today = new Date();

  return movements.reduce<BmReportStats>(
    (stats, mov) => {
      if (mov.currentOfficeId === officeId && mov.status === "INBOUND") {
        stats.totalInward += 1;
        stats.pendingInward += 1;
      }

      if (mov.fromOfficeId === officeId && mov.currentOfficeId !== officeId && mov.status === "INBOUND") {
        stats.totalOutward += 1;
      }

      if (mov.currentOfficeId === officeId && mov.status === "HOME" && mov.acceptedAt && isSameDay(mov.acceptedAt, today)) {
        stats.acceptedToday += 1;
      }

      return stats;
    },
    { totalInward: 0, totalOutward: 0, acceptedToday: 0, pendingInward: 0 }
  );
}

export async function listBmInward(ownerAdminId: string, officeLocationName: string) {
  const officeId = await resolveOfficeLocationId({ ownerAdminId, officeLocationName });
  if (!officeId) return [];

  const movements = await prisma.documentMovement.findMany({
    where: {
      registration: { ownerAdminId },
      currentModule: "REGISTRATION",
      currentOfficeId: officeId,
      status: "INBOUND",
    },
    include: {
      registration: true,
      fromOffice: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return movements.map(mapMovement);
}

export async function listBmHome(ownerAdminId: string, officeLocationName: string) {
  const officeId = await resolveOfficeLocationId({ ownerAdminId, officeLocationName });
  if (!officeId) return [];

  const movements = await prisma.documentMovement.findMany({
    where: {
      registration: { ownerAdminId },
      currentModule: "REGISTRATION",
      currentOfficeId: officeId,
      status: "HOME",
    },
    include: {
      registration: true,
      fromOffice: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return movements.map(mapMovement);
}

export async function listBmOutward(ownerAdminId: string, officeLocationName: string) {
  const officeId = await resolveOfficeLocationId({ ownerAdminId, officeLocationName });
  if (!officeId) return [];

  const movements = await prisma.documentMovement.findMany({
    where: {
      registration: { ownerAdminId },
      fromOfficeId: officeId,
      status: "INBOUND", // Sent, waiting to be accepted
    },
    include: {
      registration: true,
      fromOffice: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return movements.map(mapMovement);
}

export async function acceptBmRegistration(params: {
  id: string;
  ownerAdminId: string;
  officeLocationName: string;
  acceptedByUserId: string;
  acceptedByName?: string;
}) {
  const officeId = await resolveOfficeLocationId({
    ownerAdminId: params.ownerAdminId,
    officeLocationName: params.officeLocationName,
  });

  if (!officeId) return null;

  return prisma.$transaction(async (tx) => {
    const movement = await tx.documentMovement.findFirst({
      where: {
        registrationId: params.id,
        currentModule: "REGISTRATION",
        currentOfficeId: officeId,
        status: "INBOUND",
        registration: { ownerAdminId: params.ownerAdminId },
      },
      include: { registration: true },
    });

    if (!movement) return null;

    const updated = await tx.documentMovement.update({
      where: { trackingNumber: movement.trackingNumber },
      data: {
        status: "HOME",
        acceptedAt: new Date(),
        acceptedBy: params.acceptedByName ?? params.acceptedByUserId,
      },
    });

    await tx.movementHistory.create({
      data: {
        trackingNumber: movement.trackingNumber,
        action: "Accepted",
        oldStatus: "INBOUND",
        newStatus: "HOME",
        oldOffice: params.officeLocationName,
        newOffice: params.officeLocationName,
        performedBy: params.acceptedByName ?? params.acceptedByUserId,
      },
    });

    const latestMovement = await tx.branchMovementRecord.findFirst({
      where: {
        trackingNumber: movement.trackingNumber,
        ownerAdminId: params.ownerAdminId,
        movementStatus: "In Transit",
      },
      orderBy: { createdAt: "desc" },
    });

    if (latestMovement) {
      await tx.branchMovementRecord.update({
        where: { id: latestMovement.id },
        data: {
          movementStatus: "Completed",
          receivedBy: params.acceptedByName ?? params.acceptedByUserId,
          receiveDateTime: new Date(),
        },
      });
    }

    return updated;
  });
}

export async function markReadyForDelivery(params: {
  id: string;
  ownerAdminId: string;
  officeLocationName: string;
  performedByUserId: string;
  performedByName?: string;
}) {
  const officeId = await resolveOfficeLocationId({
    ownerAdminId: params.ownerAdminId,
    officeLocationName: params.officeLocationName,
  });

  if (!officeId) return null;

  return prisma.$transaction(async (tx) => {
    const movement = await tx.documentMovement.findFirst({
      where: {
        registrationId: params.id,
        currentModule: "REGISTRATION",
        currentOfficeId: officeId,
        status: "HOME",
        registration: { ownerAdminId: params.ownerAdminId },
      },
      include: { registration: true },
    });

    if (!movement) throw new Error("Document movement not found in HOME.");

    const updated = await tx.documentMovement.update({
      where: { trackingNumber: movement.trackingNumber },
      data: {
        status: "READY_FOR_DELIVERY",
        currentModule: "READY_FOR_DELIVERY",
        updatedAt: new Date(),
      },
    });

    await tx.movementHistory.create({
      data: {
        trackingNumber: movement.trackingNumber,
        action: "Ready For Delivery",
        oldStatus: "HOME",
        newStatus: "READY_FOR_DELIVERY",
        oldOffice: params.officeLocationName,
        newOffice: params.officeLocationName,
        performedBy: params.performedByName ?? params.performedByUserId,
      },
    });

    return updated;
  });
}
