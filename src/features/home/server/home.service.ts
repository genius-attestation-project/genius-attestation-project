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
    advancePaid: reg.advancePaid ? Number(reg.advancePaid) : 0,
    movementApproved: Boolean(reg.movementApproved),
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
      if (mov.currentOfficeId === officeId && (mov.status === "INBOUND" || mov.status === "INBOUND_PENDING" || mov.status === "Pending Receive")) {
        stats.totalInward += 1;
        stats.pendingInward += 1;
      }

      if (mov.fromOfficeId === officeId && mov.currentOfficeId !== officeId && (mov.status === "INBOUND" || mov.status === "INBOUND_PENDING" || mov.status === "Pending Receive")) {
        stats.totalOutward += 1;
      }

      if (mov.currentOfficeId === officeId && (mov.status === "HOME" || mov.status === "Received" || mov.status === "Document In Hand") && mov.acceptedAt && isSameDay(mov.acceptedAt, today)) {
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
      currentOfficeId: officeId,
      status: { in: ["INBOUND", "INBOUND_PENDING", "Pending Receive", "Pending"] },
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
      currentOfficeId: officeId,
      status: { in: ["HOME", "Received", "Document In Hand", "IN_HAND"] },
      currentStatus: { notIn: ["Completed", "Returned", "Rejected", "In Sub Package", "Ready for Delivery", "READY_FOR_DELIVERY"] },
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
      status: { in: ["INBOUND", "INBOUND_PENDING", "Pending Receive"] },
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
        currentOfficeId: officeId,
        status: { in: ["INBOUND", "INBOUND_PENDING", "Pending Receive"] },
        registration: { ownerAdminId: params.ownerAdminId },
      },
      include: { registration: true },
    });

    if (!movement) return null;

    const updated = await tx.documentMovement.update({
      where: { trackingNumber: movement.trackingNumber },
      data: {
        status: "HOME",
        currentModule: "HOME",
        currentStatus: "Document In Hand",
        acceptedAt: new Date(),
        acceptedBy: params.acceptedByName ?? params.acceptedByUserId,
      },
    });

    await tx.movementHistory.create({
      data: {
        trackingNumber: movement.trackingNumber,
        action: "Accepted",
        oldStatus: movement.status,
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
        currentOfficeId: officeId,
        status: { in: ["HOME", "Received", "Document In Hand", "IN_HAND"] },
        registration: { ownerAdminId: params.ownerAdminId },
      },
      include: { registration: true },
    });

    if (!movement) throw new Error("Document movement not found in HOME.");

    const reg = movement.registration;
    const deliveryLoc = (reg?.deliveryLocation || "").trim().toLowerCase();
    const currentLoc = params.officeLocationName.trim().toLowerCase();

    if (deliveryLoc && deliveryLoc !== currentLoc) {
      throw new Error(`Cannot mark ready for delivery: Delivery Location is ${reg?.deliveryLocation}, but current receiving office is ${params.officeLocationName}.`);
    }

    const mainProcessCheck = await verifyCoreSubProcessCompleted(movement.trackingNumber, params.ownerAdminId);
    if (!mainProcessCheck.isCompleted) {
      throw new Error(`Cannot mark ready for delivery: Main Process is not completed.`);
    }

    const updated = await tx.documentMovement.update({
      where: { trackingNumber: movement.trackingNumber },
      data: {
        status: "Ready for Delivery",
        currentModule: "READY_FOR_DELIVERY",
        currentStatus: "READY_FOR_DELIVERY",
        updatedAt: new Date(),
      },
    });

    await tx.registration.update({
      where: { trackingNumber: movement.trackingNumber },
      data: {
        trackingStatus: "Ready for Delivery",
        bmStatus: "Ready for Delivery",
      },
    });

    await tx.movementHistory.create({
      data: {
        trackingNumber: movement.trackingNumber,
        action: "Ready For Delivery",
        oldStatus: movement.status,
        newStatus: "Ready for Delivery",
        oldOffice: params.officeLocationName,
        newOffice: params.officeLocationName,
        performedBy: params.performedByName ?? params.performedByUserId,
      },
    });

    return updated;
  });
}
