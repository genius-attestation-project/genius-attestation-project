import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { HomeItem, HomeStats } from "@/features/home/types/home.types";
import { resolveOfficeLocationId } from "@/lib/office-location";
import { verifyCoreSubProcessCompleted } from "@/features/process/server/core-subprocess-validation";

function logHomeWorkflow(message: string, payload: Record<string, unknown>) {
  console.info(`[home] ${message}`, payload);
}

function formatDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function isSameDay(date: Date, compare: Date) {
  return (
    date.getFullYear() === compare.getFullYear() &&
    date.getMonth() === compare.getMonth() &&
    date.getDate() === compare.getDate()
  );
}

function mapMovement(movement: any): HomeItem {
  const reg = movement.registration || {};
  return {
    id: reg.id || movement.id,
    trackingNumber: movement.trackingNumber,
    registrationNumber: movement.trackingNumber,
    customerName: reg.customerName || movement.trackingNumber,
    clientName: reg.customerName || movement.trackingNumber,
    mobile: reg.mobile || "-",
    documentType: reg.documentType || "-",
    processType: reg.processType || "-",
    mainProcess: reg.processType || "-",
    subPackage: reg.subPackage || "-",
    service: reg.externalProcess ?? reg.processType ?? reg.documentType ?? "-",
    sourceOffice: movement.fromOffice?.officeName ?? reg.regionOfRegistration ?? "-",
    regionOfRegistration: reg.regionOfRegistration ?? "-",
    deliveryLocation: reg.deliveryLocation ?? "-",
    totalCharges: reg.totalCharges ? Number(reg.totalCharges) : 0,
    createdBy: movement.createdBy ?? reg.createdBy ?? "-",
    createdDate: formatDate(movement.createdAt),
    createdAt: reg.createdAt || movement.createdAt,
    status: movement.status,
    trackingStatus: reg.trackingStatus || movement.status,
    acceptedAt: movement.acceptedAt ? movement.acceptedAt.toISOString() : null,
    acceptedDate: movement.acceptedAt ? formatDate(movement.acceptedAt) : null,
    acceptedBy: movement.acceptedBy ?? null,
    isBmLocked: Boolean(reg.isBmLocked),
    bmExtensionStatus: reg.bmExtensionStatus || null,
  };
}

export async function getHomeStats(ownerAdminId: string, officeLocationName: string): Promise<HomeStats> {
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

  return movements.reduce<HomeStats>(
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

export async function listHomeInward(ownerAdminId: string, officeLocationName: string) {
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

export async function listHomeInHand(ownerAdminId: string, officeLocationName: string) {
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

export async function listHomeOutward(ownerAdminId: string, officeLocationName: string) {
  const officeId = await resolveOfficeLocationId({ ownerAdminId, officeLocationName });
  if (!officeId) return [];

  const movements = await prisma.documentMovement.findMany({
    where: {
      registration: { ownerAdminId },
      fromOfficeId: officeId,
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

export async function acceptHomeRegistration(params: {
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

    const coreCheck = await verifyCoreSubProcessCompleted(movement.trackingNumber, params.ownerAdminId);
    if (!coreCheck.isCompleted) {
      throw new Error(
        coreCheck.message ||
          "This document cannot be moved to Ready For Delivery because the Main Process has not been completed."
      );
    }

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
