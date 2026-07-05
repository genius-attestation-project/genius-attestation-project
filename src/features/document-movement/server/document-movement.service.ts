import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getDocumentMovementsByOffice(
  ownerAdminId: string,
  officeLocationId: string,
  module: string,
  status: string
) {
  const movements = await prisma.documentMovement.findMany({
    where: {
      registration: { ownerAdminId },
      currentOfficeId: officeLocationId,
      currentModule: module,
      status: status,
    },
    include: {
      registration: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return movements;
}

export async function sendToOffice(
  ownerAdminId: string,
  trackingNumber: string,
  fromOfficeId: string,
  toOfficeId: string,
  fromModule: string,
  toModule: string,
  performedBy: string,
  remarks?: string
) {
  const movement = await prisma.documentMovement.findUnique({
    where: { trackingNumber },
  });

  if (!movement) throw new Error("Document movement not found.");

  const fromOffice = await prisma.officeLocation.findUnique({ where: { id: fromOfficeId } });
  const toOffice = await prisma.officeLocation.findUnique({ where: { id: toOfficeId } });

  await prisma.documentMovement.update({
    where: { trackingNumber },
    data: {
      fromOfficeId,
      toOfficeId,
      fromModule,
      toModule,
      currentOfficeId: toOfficeId,
      currentModule: toModule,
      status: "INBOUND",
      sentAt: new Date(),
      createdBy: performedBy,
      remarks,
    },
  });

  await prisma.movementHistory.create({
    data: {
      trackingNumber,
      action: "Sent",
      oldStatus: movement.status,
      newStatus: "INBOUND",
      oldOffice: fromOffice?.officeName,
      newOffice: toOffice?.officeName,
      performedBy,
      remarks,
    },
  });
}

export async function acceptDocument(
  ownerAdminId: string,
  trackingNumber: string,
  performedBy: string,
  remarks?: string
) {
  const movement = await prisma.documentMovement.findUnique({
    where: { trackingNumber },
  });

  if (!movement) throw new Error("Document movement not found.");

  const office = await prisma.officeLocation.findUnique({ where: { id: movement.currentOfficeId || "" } });

  await prisma.documentMovement.update({
    where: { trackingNumber },
    data: {
      status: "HOME",
      acceptedAt: new Date(),
      acceptedBy: performedBy,
      remarks,
    },
  });

  await prisma.movementHistory.create({
    data: {
      trackingNumber,
      action: "Accepted",
      oldStatus: movement.status,
      newStatus: "HOME",
      oldOffice: office?.officeName,
      newOffice: office?.officeName,
      performedBy,
      remarks,
    },
  });
}
